// Compares the memoized scheduler against exhaustive backtracking.
// Both must return the same top-K scores; prints timings for each.
//
//   npx ts-node src/scripts/benchmark.ts

import { Course } from "../models/Course";
import { ScheduledCourse } from "../models/Schedule";
import { SearchCriteria } from "../models/SearchCriteria";
import { courseRepository } from "../repositories/courseRepository";
import { selectCandidates } from "../services/coursePlanner";
import { generateSchedules } from "../services/scheduleService";
import {
    REQUIREMENT_POINTS,
    preferenceScore,
    requirementsFilled,
} from "../services/scoringService";
import { canAddSection } from "../utils/scheduleUtils";

const K = 50;

// Exhaustive search is exponential, so compare on a smaller candidate set
// than the API's 40.
const CANDIDATES = 26;

function scheduleScore(picks: ScheduledCourse[], criteria: SearchCriteria): number {
    let score = 0;
    const covered = new Set<string>();
    for (const { course } of picks) {
        score += preferenceScore(course, criteria);
        for (const req of requirementsFilled(course, criteria)) {
            if (!covered.has(req)) score += REQUIREMENT_POINTS;
            covered.add(req);
        }
    }
    return score;
}

// The original backtracker with no result cap: enumerate every valid
// schedule, score each, keep the top K.
function bruteForce(courses: Course[], criteria: SearchCriteria) {
    const min = criteria.targetCreditsMin ?? 12;
    const max = criteria.targetCreditsMax ?? 18;
    const scores: number[] = [];
    const current: ScheduledCourse[] = [];

    function backtrack(start: number, credits: number) {
        if (credits > max) return;
        if (credits >= min) scores.push(scheduleScore(current, criteria));
        for (let i = start; i < courses.length; i++) {
            const options = courses[i].sections.length ? courses[i].sections : [null];
            for (const section of options) {
                if (!canAddSection(current, section)) continue;
                current.push({ course: courses[i], section });
                backtrack(i + 1, credits + courses[i].credits);
                current.pop();
            }
        }
    }

    backtrack(0, 0);
    scores.sort((a, b) => b - a);
    return { explored: scores.length, top: scores.slice(0, K) };
}

function time<T>(fn: () => T): [T, number] {
    const start = process.hrtime.bigint();
    const result = fn();
    return [result, Number(process.hrtime.bigint() - start) / 1e6];
}

const scenarios: { name: string; criteria: SearchCriteria }[] = [
    { name: "empty query (12-18 cr)", criteria: {} },
    {
        name: "CS major, AI + systems, 12-15 cr",
        criteria: {
            major: "Computer Sciences BS",
            interests: ["AI", "systems"],
            targetCreditsMin: 12,
            targetCreditsMax: 15,
        },
    },
    {
        name: "humanities + ethnic studies, <=15 cr",
        criteria: {
            neededBreadth: ["Humanities"],
            neededGenEd: ["Ethnic Studies"],
            maxDifficulty: 2,
            targetCreditsMin: 12,
            targetCreditsMax: 15,
        },
    },
    {
        name: "natural + bio science, 15-18 cr",
        criteria: {
            neededBreadth: ["Natural Science", "Biological Science"],
            neededGenEd: ["GenEd"],
            maxDifficulty: 3,
            targetCreditsMin: 15,
            targetCreditsMax: 18,
        },
    },
];

const all = courseRepository.listAll();
// A typical sophomore, so plenty of courses are unlocked.
const completed = new Set(["COMPSCI200", "COMPSCI300", "MATH221", "MATH222", "ENGL120"]);
console.log(`${all.length} catalog courses, ${CANDIDATES} candidates per scenario\n`);

for (const { name, criteria } of scenarios) {
    const ranked = selectCandidates(all, completed, criteria, CANDIDATES);

    const [brute, bruteMs] = time(() => bruteForce(ranked, criteria));
    const [memo, memoMs] = time(() => generateSchedules(ranked, criteria, K));

    const memoTop = memo.map((s) => s.score);
    const match = JSON.stringify(memoTop) === JSON.stringify(brute.top);

    console.log(name);
    console.log(`  exhaustive: ${bruteMs.toFixed(0).padStart(7)} ms  (${brute.explored.toLocaleString()} valid schedules scored)`);
    console.log(`  memoized:   ${memoMs.toFixed(0).padStart(7)} ms  (${(bruteMs / memoMs).toFixed(1)}x faster)`);
    console.log(`  top-${K} scores match: ${match ? "yes" : "NO"}  (best = ${memoTop[0]})\n`);
}
