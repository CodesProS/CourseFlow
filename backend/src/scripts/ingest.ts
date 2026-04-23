/**
 * Pulls course data from a local clone of uw-coursemap-data and writes
 * our normalized Course[] to backend/data/courses.json.
 *
 * Usage:
 *   UW_COURSEMAP_DATA=/path/to/uw-coursemap-data npm run ingest
 *
 * Only courses that have live meetings.json are kept — without timings
 * we can't schedule them. Lectures only for now; lab/discussion coupling
 * is out of scope.
 */

import * as fs from "fs";
import * as path from "path";
import type { Course, Section, MeetingTime } from "../models/Course";

// Subjects to include. These all have meetings.json in the source and
// give us a decent STEM + humanities mix.
const TARGET_SUBJECTS = ["COMPSCI", "MATH", "PHYSICS", "ENGL", "HISTORY", "KINES"];

// uw-coursemap-data doesn't expose UW's real breadth codes, so fake it
// from the subject. Good enough for the catalog we're building.
const BREADTH_BY_SUBJECT: Record<string, string> = {
    COMPSCI: "Natural Science",
    MATH: "Natural Science",
    PHYSICS: "Natural Science",
    ENGL: "Humanities",
    HISTORY: "Humanities",
    KINES: "Biological Science",
};

const UW_DATA_ROOT =
    process.env.UW_COURSEMAP_DATA ??
    path.resolve(__dirname, "../../../../uw-coursemap-data");

const OUTPUT_PATH = path.resolve(__dirname, "../../data/courses.json");

// --- external shapes (subset of what uw-coursemap-data publishes) ---

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
    cumulative_grade_data?: RawGradeData | null;
    term_data?: Record<string, RawTermData>;
}

interface RawMeeting {
    course_reference: RawCourseReference;
    start_time: number;  // unix ms
    end_time: number;    // unix ms
    name: string;        // "LEC 001 #14"
    type: string;        // "CLASS", "EXAM", ...
}

// --- helpers ---

// Cross-listed courses get flattened to the first subject. Loses some
// info but keeps downstream code simple.
function refToCode(ref: RawCourseReference): string {
    return `${ref.subjects[0]}${ref.course_number}`;
}

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
    // hour12:false gives "24" at midnight — normalize.
    const rawHour = get("hour");
    const hour = rawHour === "24" ? "00" : rawHour;
    return { day: get("weekday"), time: `${hour}:${get("minute")}` };
}

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

// UW course numbers roughly track level: 0-199 intro, 200-399 mid, 400+ advanced.
function difficultyFromNumber(n: number): number {
    if (n < 200) return 1;
    if (n < 400) return 2;
    return 3;
}

// --- transform ---

function summarizeTerms(raw: RawCourse): {
    credits: number;
    genEd: string[];
    avgGpa: number | null;
} {
    // Grab most recent enrollment snapshot for credits + gen-ed flags.
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

    // Use the precomputed cumulative distribution instead of re-summing terms.
    const avgGpa = raw.cumulative_grade_data
        ? averageGpa(raw.cumulative_grade_data)
        : null;

    const credits = latestEnrollment?.credit_count?.[1] ?? 3;
    const genEd: string[] = [];
    if (latestEnrollment?.general_education) genEd.push("GenEd");
    if (latestEnrollment?.ethnics_studies) genEd.push("Ethnic Studies");

    return { credits, genEd, avgGpa };
}

// meetings.json lists individual sessions on specific dates. We need
// weekly recurring patterns, so group by section and dedupe on
// (day, start, end). Filter to LEC only — labs/discussions skipped.
function buildSections(meetings: RawMeeting[]): Section[] {
    const groups = new Map<string, RawMeeting[]>();
    for (const m of meetings) {
        if (m.type !== "CLASS") continue;
        if (!m.name.startsWith("LEC ")) continue;
        const [kind, sectionNumber] = m.name.split(" "); // e.g. ["LEC", "001"]
        const key = `${kind} ${sectionNumber}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(m);
    }

    const sections: Section[] = [];
    for (const [groupKey, sessions] of groups) {
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

function buildCourse(raw: RawCourse, rawMeetings: RawMeeting[]): Course | null {
    const ref = raw.course_reference;
    if (!TARGET_SUBJECTS.some((s) => ref.subjects.includes(s))) return null;

    const sections = buildSections(rawMeetings);
    if (sections.length === 0) return null;

    const { credits, genEd, avgGpa } = summarizeTerms(raw);
    const primarySubject = ref.subjects[0];

    const course: Course = {
        code: refToCode(ref),
        name: raw.course_title,
        credits,
        difficulty: difficultyFromNumber(ref.course_number),
        tags: [...(raw.keywords ?? [])],
        breadth: BREADTH_BY_SUBJECT[primarySubject],
        genEd: genEd.length ? genEd : undefined,
        creditType: "L&S",
        prerequisites: (raw.optimized_prerequisites ?? []).map(refToCode),
        sections,
    };

    // TODO: add avgGpa to the Course type proper instead of tacking it on here.
    (course as Course & { avgGpa?: number | null }).avgGpa = avgGpa;

    return course;
}

// --- extract + load ---

function loadRawCourses(): Array<{ course: RawCourse; meetings: RawMeeting[] }> {
    const courseDir = path.join(UW_DATA_ROOT, "course");
    if (!fs.existsSync(courseDir)) {
        throw new Error(
            `No uw-coursemap-data at ${UW_DATA_ROOT}. Set UW_COURSEMAP_DATA or clone it as a sibling.`,
        );
    }

    const results: Array<{ course: RawCourse; meetings: RawMeeting[] }> = [];

    for (const entry of fs.readdirSync(courseDir)) {
        if (!entry.endsWith(".json")) continue;
        if (!TARGET_SUBJECTS.some((s) => entry.startsWith(`${s}_`))) continue;

        const stem = entry.replace(/\.json$/, "");
        const meetingsPath = path.join(courseDir, stem, "meetings.json");
        if (!fs.existsSync(meetingsPath)) continue;

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

function writeCoursesJson(courses: Course[]): void {
    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(courses, null, 2) + "\n");
}

function main(): void {
    console.log(`Reading uw-coursemap-data from: ${UW_DATA_ROOT}`);
    const raws = loadRawCourses();
    console.log(`  Found ${raws.length} candidate courses with meetings data`);

    const courses: Course[] = [];
    for (const { course: raw, meetings } of raws) {
        const built = buildCourse(raw, meetings);
        if (built) courses.push(built);
    }

    // Keep output sorted so diffs are stable.
    courses.sort((a, b) => a.code.localeCompare(b.code));

    writeCoursesJson(courses);
    console.log(`Wrote ${courses.length} courses to ${OUTPUT_PATH}`);
}

main();
