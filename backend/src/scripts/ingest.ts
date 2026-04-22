/**
 * ingest.ts
 *
 * Reads a local clone of https://github.com/twangodev/uw-coursemap-data
 * and produces backend/data/courses.json in our internal Course[] shape.
 *
 * Usage:
 *   UW_COURSEMAP_DATA=/path/to/uw-coursemap-data npm run ingest
 *
 * Or, if the clone is at ../uw-coursemap-data relative to this repo:
 *   npm run ingest
 *
 * ---------------------------------------------------------------
 * ETL pipeline (Extract -> Transform -> Load):
 *   Extract:   walk uw-coursemap-data's course/ dir, read JSON files
 *   Transform: reshape each record into our Course/Section/MeetingTime
 *   Load:      write courses.json (the committed artifact)
 *
 * Only courses that have meetings.json (i.e. live current-semester sessions)
 * are included, because without timing data we can't schedule them.
 * Lectures (LEC) only for MVP; labs/discussions are filtered out.
 * ---------------------------------------------------------------
 */

import * as fs from "fs";
import * as path from "path";
import type { Course, Section, MeetingTime } from "../models/Course";

// ---------- Configuration ----------

/** Which UW-Madison subjects to include. Chosen because they (a) have
 * real meetings data in uw-coursemap-data and (b) span STEM + humanities
 * for a compelling demo of breadth/gen-ed filtering. */
const TARGET_SUBJECTS = ["COMPSCI", "MATH", "PHYSICS", "ENGL", "HISTORY", "KINES"];

/** Hardcoded breadth-by-subject mapping. The real UW breadth codes aren't
 * in uw-coursemap-data, so this is our pragmatic approximation for the
 * MVP. A real system would derive breadth from the official UW catalog. */
const BREADTH_BY_SUBJECT: Record<string, string> = {
    COMPSCI: "Natural Science",
    MATH: "Natural Science",
    PHYSICS: "Natural Science",
    ENGL: "Humanities",
    HISTORY: "Humanities",
    KINES: "Biological Science",
};

/** Where the uw-coursemap-data clone lives. Env var wins; otherwise try
 * a sibling directory next to CourseFlow (the most common local layout). */
const UW_DATA_ROOT =
    process.env.UW_COURSEMAP_DATA ??
    path.resolve(__dirname, "../../../../uw-coursemap-data");

/** Where we write the committed artifact. backend/data/courses.json. */
const OUTPUT_PATH = path.resolve(__dirname, "../../data/courses.json");

// ---------- External data shapes (what uw-coursemap-data publishes) ----------
// We type these loosely because we only need a subset of fields, and the
// external schema is not ours to guarantee. `unknown` + manual narrowing
// would be stricter but adds a lot of boilerplate for an MVP script.

interface RawCourseReference {
    course_number: number;
    subjects: string[];
}

interface RawGradeData {
    a: number; ab: number; b: number; bc: number;
    c: number; d: number; f: number;
    total: number;
}

interface RawEnrollmentData {
    credit_count: [number, number];
    ethnics_studies: boolean;
    general_education: boolean;
    typically_offered?: string;
}

interface RawTermData {
    enrollment_data: RawEnrollmentData | null;
    grade_data: RawGradeData | null;
}

interface RawCourse {
    course_reference: RawCourseReference;
    course_title: string;
    description: string;
    keywords: string[];
    optimized_prerequisites: RawCourseReference[] | null;
    /** Aggregate grade counts across all historical terms. */
    cumulative_grade_data?: RawGradeData | null;
    /** Per-term snapshot, keyed by term code (e.g. "1266" = spring 2026). */
    term_data?: Record<string, RawTermData>;
}

interface RawMeeting {
    course_reference: RawCourseReference;
    start_time: number;  // Unix ms
    end_time: number;    // Unix ms
    name: string;        // e.g. "LEC 001 #14"
    type: string;        // "CLASS", "EXAM", ...
}

// ---------- Utility helpers ----------

/** Normalize a (subjects, number) pair into a flat string code like
 * "COMPSCI200". Uses the first subject for cross-listed courses — we
 * accept the loss of secondary listings for MVP. */
function refToCode(ref: RawCourseReference): string {
    return `${ref.subjects[0]}${ref.course_number}`;
}

/**
 * Convert a Unix-ms timestamp into {day: "Mon", time: "10:00"} in Central
 * Time (America/Chicago), which is where UW-Madison operates. Intl handles
 * DST correctly, so we don't have to track CST vs CDT ourselves.
 */
const chicagoFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
});

function parseTimestamp(ms: number): { day: string; time: string } {
    const parts = chicagoFormatter.formatToParts(new Date(ms));
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    // Intl can return "24" for midnight under hour12:false; normalize to "00".
    const rawHour = get("hour");
    const hour = rawHour === "24" ? "00" : rawHour;
    return { day: get("weekday"), time: `${hour}:${get("minute")}` };
}

/**
 * Compute an average GPA from a grade-count distribution. UW uses the
 * 4.0/3.5/3.0/2.5/2.0/1.0/0.0 scale (A, AB, B, BC, C, D, F respectively).
 * Returns null if no graded students.
 */
function averageGpa(grades: RawGradeData): number | null {
    const graded =
        grades.a + grades.ab + grades.b + grades.bc + grades.c + grades.d + grades.f;
    if (graded === 0) return null;
    const points =
        grades.a * 4.0 +
        grades.ab * 3.5 +
        grades.b * 3.0 +
        grades.bc * 2.5 +
        grades.c * 2.0 +
        grades.d * 1.0 +
        grades.f * 0.0;
    return +(points / graded).toFixed(2);
}

/**
 * Difficulty heuristic: UW course numbers loosely indicate level.
 * 0-199 = introductory, 200-399 = intermediate, 400+ = advanced.
 */
function difficultyFromNumber(n: number): number {
    if (n < 200) return 1;
    if (n < 400) return 2;
    return 3;
}

// ---------- Transform ----------

/**
 * Aggregate all term data inside a raw course into a single {credits,
 * genEd, avgGpa, typicallyOffered} summary. We walk all term codes,
 * prefer the most recent enrollment_data (has credits/gen-ed flags),
 * and sum all grade_data (more statistical power).
 *
 * Term codes are 4-digit numbers (e.g. 1266); higher = more recent.
 */
function summarizeTerms(raw: RawCourse): {
    credits: number;
    genEd: string[];
    avgGpa: number | null;
} {
    // Walk raw.term_data (keyed by term code; higher = more recent) and
    // keep the most recent term's enrollment snapshot. That gives us the
    // current credit count, gen-ed flag, ethnic-studies flag.
    let latestEnrollment: RawEnrollmentData | null = null;
    let latestTerm = -Infinity;

    for (const [key, value] of Object.entries(raw.term_data ?? {})) {
        if (!/^\d+$/.test(key)) continue;
        const termNum = Number(key);
        if (value.enrollment_data && termNum > latestTerm) {
            latestTerm = termNum;
            latestEnrollment = value.enrollment_data;
        }
    }

    // Prefer the precomputed cumulative_grade_data for avg GPA — it
    // aggregates across all historical terms, so we don't have to
    // re-sum. This is a tiny example of trusting upstream precomputation
    // rather than redoing it.
    const avgGpa = raw.cumulative_grade_data
        ? averageGpa(raw.cumulative_grade_data)
        : null;

    const credits = latestEnrollment?.credit_count?.[1] ?? 3; // default 3 cr
    const genEd: string[] = [];
    if (latestEnrollment?.general_education) genEd.push("GenEd");
    if (latestEnrollment?.ethnics_studies) genEd.push("Ethnic Studies");

    return { credits, genEd, avgGpa };
}

/**
 * Turn raw meetings.json (list of dated sessions) into weekly-recurring
 * Section[] objects. Pipeline:
 *   1. Filter: type === "CLASS" and name starts with "LEC " (MVP scope).
 *   2. Group sessions by section identifier (first two tokens: "LEC 001").
 *   3. Within each group, dedupe by (day, startTime, endTime) — many Mondays
 *      collapse into a single MeetingTime. This is the "sessions -> weekly
 *      pattern" transform.
 */
function buildSections(meetings: RawMeeting[]): Section[] {
    // Group by e.g. "LEC 001"
    const groups = new Map<string, RawMeeting[]>();
    for (const m of meetings) {
        if (m.type !== "CLASS") continue;
        if (!m.name.startsWith("LEC ")) continue; // labs/discussions skipped
        const [kind, sectionNumber] = m.name.split(" "); // ["LEC", "001"]
        const key = `${kind} ${sectionNumber}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(m);
    }

    const sections: Section[] = [];
    for (const [groupKey, sessions] of groups) {
        // Dedupe (day, start, end) within this section.
        const seen = new Set<string>();
        const weeklyMeetings: MeetingTime[] = [];
        for (const s of sessions) {
            const start = parseTimestamp(s.start_time);
            const end = parseTimestamp(s.end_time);
            const dedupeKey = `${start.day}|${start.time}|${end.time}`;
            if (seen.has(dedupeKey)) continue;
            seen.add(dedupeKey);
            weeklyMeetings.push({
                day: start.day,
                startTime: start.time,
                endTime: end.time,
            });
        }
        if (weeklyMeetings.length === 0) continue;

        const [, sectionNumber] = groupKey.split(" ");
        sections.push({
            sectionId: sectionNumber,
            type: "Lecture",
            meetings: weeklyMeetings,
        });
    }

    return sections;
}

/** Top-level transform: RawCourse + raw meetings -> our Course shape. */
function buildCourse(raw: RawCourse, rawMeetings: RawMeeting[]): Course | null {
    const ref = raw.course_reference;
    if (!TARGET_SUBJECTS.some((s) => ref.subjects.includes(s))) return null;

    const sections = buildSections(rawMeetings);
    if (sections.length === 0) return null; // no usable lecture sections

    const { credits, genEd, avgGpa } = summarizeTerms(raw);
    const primarySubject = ref.subjects[0];

    // We stash avgGpa into tags so the scoring service can access it
    // without a schema change. A cleaner approach would be a new
    // `avgGpa?: number` field on Course; deferring for MVP.
    const tags = [...(raw.keywords ?? [])];

    const course: Course = {
        code: refToCode(ref),
        name: raw.course_title,
        credits,
        difficulty: difficultyFromNumber(ref.course_number),
        tags,
        breadth: BREADTH_BY_SUBJECT[primarySubject],
        genEd: genEd.length ? genEd : undefined,
        creditType: "L&S",
        prerequisites: (raw.optimized_prerequisites ?? []).map(refToCode),
        sections,
    };

    // Attach avgGpa as a non-enumerable property through a cast, so it
    // round-trips through JSON.stringify. Small hack; documented below.
    (course as Course & { avgGpa?: number | null }).avgGpa = avgGpa;

    return course;
}

// ---------- Extract ----------

/**
 * Scan uw-coursemap-data/course/ and return raw records for every course
 * that (a) matches a target subject and (b) has meetings.json available.
 */
function loadRawCourses(): Array<{ course: RawCourse; meetings: RawMeeting[] }> {
    const courseDir = path.join(UW_DATA_ROOT, "course");
    if (!fs.existsSync(courseDir)) {
        throw new Error(
            `Could not find uw-coursemap-data at ${UW_DATA_ROOT}. ` +
                `Either clone it there, or set UW_COURSEMAP_DATA env var.`,
        );
    }

    const results: Array<{ course: RawCourse; meetings: RawMeeting[] }> = [];

    for (const entry of fs.readdirSync(courseDir)) {
        if (!entry.endsWith(".json")) continue;

        // Only read files that start with a target subject prefix.
        // e.g. "COMPSCI_200.json", "COMPSCI_ECE_252.json".
        const matchesSubject = TARGET_SUBJECTS.some(
            (s) => entry.startsWith(`${s}_`),
        );
        if (!matchesSubject) continue;

        const stem = entry.replace(/\.json$/, ""); // "COMPSCI_200"
        const meetingsPath = path.join(courseDir, stem, "meetings.json");
        if (!fs.existsSync(meetingsPath)) continue; // skip courses without meetings

        const course = JSON.parse(
            fs.readFileSync(path.join(courseDir, entry), "utf8"),
        ) as RawCourse;
        const meetings = JSON.parse(
            fs.readFileSync(meetingsPath, "utf8"),
        ) as RawMeeting[];

        results.push({ course, meetings });
    }

    return results;
}

// ---------- Load ----------

function writeCoursesJson(courses: Course[]): void {
    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(courses, null, 2) + "\n");
}

// ---------- Main ----------

function main(): void {
    console.log(`Reading uw-coursemap-data from: ${UW_DATA_ROOT}`);
    const raws = loadRawCourses();
    console.log(`  Found ${raws.length} candidate courses with meetings data`);

    const courses: Course[] = [];
    for (const { course: raw, meetings } of raws) {
        const built = buildCourse(raw, meetings);
        if (built) courses.push(built);
    }

    // Sort by code for deterministic output — same input always produces
    // the same courses.json, so version control diffs stay meaningful.
    courses.sort((a, b) => a.code.localeCompare(b.code));

    writeCoursesJson(courses);
    console.log(`Wrote ${courses.length} courses to ${OUTPUT_PATH}`);
}

main();
