import { Course, Section } from "../models/Course";
import { Schedule } from "../models/Schedule";
import { SearchCriteria } from "../models/SearchCriteria";
import { buildSectionMasks } from "../utils/scheduleUtils";
import {
    REQUIREMENT_POINTS,
    preferenceScore,
    requirementsFilled,
} from "./scoringService";

const DEFAULT_MAX_RESULTS = 50;

// Picks are a persistent linked list so partial schedules cached in the
// memo can be shared between parents without copying. `section` is null for
// a course with no listed meeting times.
type Pick = { course: Course; section: Section | null; next: Pick | null };
// `rank` orders the search; `points` is the score shown to the user.
type Partial = { rank: number; points: number; picks: Pick | null };

// rank = points * RANK_SCALE - (courses without times), so among schedules
// with equal points, ones that can be fully placed on a timetable win.
const RANK_SCALE = 100;

const NO_SCHEDULES: Partial[] = [];

function popcount(x: number): number {
    let count = 0;
    while (x) {
        x &= x - 1;
        count++;
    }
    return count;
}

/**
 * Returns the `maxResults` highest-scoring conflict-free schedules whose
 * credits fall in the target range.
 *
 * Backtracking with memoization (top-down DP). After deciding courses
 * 0..i-1, the best ways to finish a schedule depend only on:
 *   - i        — the next course to decide
 *   - credits  — credits taken so far
 *   - busy     — bitmask of occupied time slots
 *   - covered  — bitmask of needed breadth/gen-ed already filled
 * Different partial schedules often land on the same state (UW uses a
 * handful of standard time blocks), so each state's top-K completions are
 * computed once and reused.
 *
 * Courses without meeting times take no time slots, so they never conflict;
 * they count toward credits and score but can't be placed on a timetable.
 */
export function generateSchedules(
    courses: Course[],
    criteria: SearchCriteria,
    maxResults: number = DEFAULT_MAX_RESULTS
): Schedule[] {
    const minCredits = criteria.targetCreditsMin ?? 12;
    const maxCredits = criteria.targetCreditsMax ?? 18;
    const n = courses.length;

    const sectionMasks = buildSectionMasks(courses);

    // Per-course score parts, computed once.
    const prefScore = courses.map((c) => preferenceScore(c, criteria));
    const reqBits = new Map<string, number>();
    const reqMask = courses.map((c) => {
        let mask = 0;
        for (const key of requirementsFilled(c, criteria)) {
            if (!reqBits.has(key)) reqBits.set(key, reqBits.size);
            mask |= 1 << reqBits.get(key)!;
        }
        return mask;
    });

    // Suffix aggregates over courses i..n-1. Time slots and requirements
    // that no remaining course touches can't affect the rest of the search,
    // so they're masked out of the memo key — more states collapse together.
    const futureTime: bigint[] = new Array(n + 1).fill(0n);
    const futureReq: number[] = new Array(n + 1).fill(0);
    const creditsFrom: number[] = new Array(n + 1).fill(0);
    for (let i = n - 1; i >= 0; i--) {
        let time = futureTime[i + 1];
        for (const section of courses[i].sections) {
            time |= sectionMasks.get(section)!;
        }
        futureTime[i] = time;
        futureReq[i] = futureReq[i + 1] | reqMask[i];
        creditsFrom[i] = creditsFrom[i + 1] + courses[i].credits;
    }

    const memo = new Map<string, Partial[]>();

    // Top-K completions from state (i, credits, busy, covered), best first.
    // Scores are relative: only points earned from course i onward.
    function solve(i: number, credits: number, busy: bigint, covered: number): Partial[] {
        // Even taking every remaining course can't reach the minimum.
        if (credits + creditsFrom[i] < minCredits) return NO_SCHEDULES;
        if (i === n) return [{ rank: 0, points: 0, picks: null }];

        busy &= futureTime[i];
        covered &= futureReq[i];

        const key = `${i}|${credits}|${busy}|${covered}`;
        const cached = memo.get(key);
        if (cached) return cached;

        // Option 1: skip course i.
        const candidates: Partial[] = [...solve(i + 1, credits, busy, covered)];

        // Option 2: take course i in any section that fits (or, with no
        // listed times, as-is).
        const course = courses[i];
        if (credits + course.credits <= maxCredits) {
            const gain =
                prefScore[i] + REQUIREMENT_POINTS * popcount(reqMask[i] & ~covered);
            const nextCovered = covered | reqMask[i];
            const untimed = course.sections.length === 0;
            const options: Array<{ section: Section | null; mask: bigint }> = untimed
                ? [{ section: null, mask: 0n }]
                : course.sections.map((section) => ({ section, mask: sectionMasks.get(section)! }));

            for (const { section, mask } of options) {
                if (mask & busy) continue;

                const rest = solve(i + 1, credits + course.credits, busy | mask, nextCovered);
                for (const p of rest) {
                    candidates.push({
                        rank: p.rank + gain * RANK_SCALE - (untimed ? 1 : 0),
                        points: p.points + gain,
                        picks: { course, section, next: p.picks },
                    });
                }
            }
        }

        candidates.sort((a, b) => b.rank - a.rank);
        const best = candidates.length > maxResults
            ? candidates.slice(0, maxResults)
            : candidates;
        memo.set(key, best);
        return best;
    }

    return solve(0, 0, 0n, 0).map(({ points, picks }) => {
        const scheduled = [];
        let totalCredits = 0;
        for (let p = picks; p; p = p.next) {
            scheduled.push({ course: p.course, section: p.section });
            totalCredits += p.course.credits;
        }
        return { courses: scheduled, totalCredits, score: points };
    });
}
