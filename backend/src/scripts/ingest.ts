/**
 * Pulls course data from a local clone of uw-coursemap-data and writes
 * our normalized Course[] to backend/data/courses.json.
 *
 * Usage:
 *   UW_COURSEMAP_DATA=/path/to/uw-coursemap-data npm run ingest
 *
 * Only course/*.json and course/<COURSE>/meetings.json are read, so a
 * sparse checkout of those paths is enough (see data/README.md).
 *
 * Keeps undergraduate courses that are still being taught. Courses without
 * meetings.json are kept with no sections: the planner can still suggest
 * them, it just can't place them on the timetable. Lectures only for now;
 * lab/discussion coupling is out of scope.
 */

import * as fs from "fs";
import * as path from "path";
import type { Course, Section, MeetingTime, PrereqNode } from "../models/Course";

// uw-coursemap-data doesn't expose UW's real breadth codes, so fake it
// from the subject for the handful we've mapped.
const BREADTH_BY_SUBJECT: Record<string, string> = {
    COMPSCI: "Natural Science",
    MATH: "Natural Science",
    PHYSICS: "Natural Science",
    ENGL: "Humanities",
    HISTORY: "Humanities",
    KINES: "Biological Science",
};

// 700+ are graduate-only.
const MAX_COURSE_NUMBER = 699;

// UW term codes: 1 + two-digit year + season digit (2 Fall, 4 Spring, 6 Summer).
// Untimed courses must have been taught in or after this term to be kept;
// older ones are most likely retired.
const ACTIVE_SINCE_TERM = 1232; // Fall 2022

// Most UW courses are 3 credits; used when the source has no credit count.
const DEFAULT_CREDITS = 3;

const UW_DATA_ROOT =
    process.env.UW_COURSEMAP_DATA ??
    path.resolve(__dirname, "../../../../uw-coursemap-data");

const OUTPUT_PATH = path.resolve(__dirname, "../../data/courses.json");
const SUBJECTS_OUTPUT_PATH = path.resolve(__dirname, "../../data/subjects.json");

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

// Prerequisite syntax tree. Leaves are course references, bare course
// numbers ("367", meaning the same subject as the preceding reference), or
// free text ("graduate/professional standing").
type RawPrereqNode =
    | RawCourseReference
    | string
    | { operator: "AND" | "OR"; children: RawPrereqNode[] };

interface RawPrerequisites {
    abstract_syntax_tree: RawPrereqNode | null;
    linked_requisite_text?: Array<string | RawCourseReference>;
}

interface RawCourse {
    course_reference: RawCourseReference;
    course_title: string;
    description?: string;
    keywords: string[];
    prerequisites: RawPrerequisites | null;
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

// --- prerequisites ---

// Non-course conditions an undergrad using the planner can be assumed to
// meet. We can't verify class standing, so we don't block on it.
const MET_CONDITIONS = [
    /^none$/,
    /\b(freshman|sophomore|junior|senior) standing\b/,
    /\bcommunications? a\b/,
    /\bquantitative reasoning\b/,
    /^qr$/,
    /^a requirement$/,
];

// Everything else (graduate standing, consent of instructor, declared in a
// program, placement tests, ...) is treated as unmet. Inside an OR the
// course-based route still works.
function conditionMet(text: string): boolean {
    const t = text.trim().toLowerCase().replace(/\s+/g, " ");
    return MET_CONDITIONS.some((re) => re.test(t));
}

function isReference(node: RawPrereqNode): node is RawCourseReference {
    return typeof node === "object" && "course_number" in node;
}

// Resolves leaves and constant-folds booleans, so "X or graduate standing"
// becomes just "X" and a requirement that's always met becomes `true`.
function buildPrereqTree(node: RawPrereqNode, lastSubject: string | null): PrereqNode {
    if (isReference(node)) return refToCode(node);

    if (typeof node === "string") {
        const text = node.trim();
        // "367" after "COMPSCI 320" means COMPSCI 367.
        if (/^\d{2,3}$/.test(text)) {
            return lastSubject ? `${lastSubject}${text}` : false;
        }
        // A course written out as text: "COMP SCI 367", "M E 240".
        const written = /^([A-Za-z][A-Za-z &]*?)\s+(\d{2,3})$/.exec(text);
        if (written) return `${written[1].toUpperCase().replace(/\s+/g, "")}${written[2]}`;
        return conditionMet(text);
    }

    const op = node.operator === "AND" ? "and" : "or";
    const children: PrereqNode[] = [];
    let subject = lastSubject;
    for (const child of node.children) {
        if (isReference(child)) subject = child.subjects[0];
        const built = buildPrereqTree(child, subject);
        if (typeof built === "boolean") {
            if (op === "and" && !built) return false; // AND with an unmet part
            if (op === "or" && built) return true; // OR with a met part
            continue; // drop the neutral element
        }
        children.push(built);
    }

    if (children.length === 0) return op === "and"; // all parts were neutral
    if (children.length === 1) return children[0];
    return { op, children };
}

function collectCodes(node: PrereqNode, out: Set<string>): Set<string> {
    if (typeof node === "string") out.add(node);
    else if (typeof node === "object") node.children.forEach((c) => collectCodes(c, out));
    return out;
}

// "(COMPSCI 300, 320 or 367) and (MATH 211, ...)" from the linked text.
function prerequisiteText(raw: RawPrerequisites): string | undefined {
    const parts = raw.linked_requisite_text;
    if (!parts?.length) return undefined;
    const text = parts
        .map((p) => (typeof p === "string" ? p : `${p.subjects[0]} ${p.course_number}`))
        .join("")
        .replace(/\s+/g, " ")
        .trim();
    return text && text.toLowerCase() !== "none" ? text : undefined;
}

// --- transform ---

function summarizeTerms(raw: RawCourse): {
    credits: number | null;
    genEd: string[];
    avgGpa: number | null;
    lastTaughtTerm: number;
} {
    // Grab most recent enrollment snapshot for credits + gen-ed flags.
    let latestEnrollment: RawEnrollmentData | null = null;
    let latestEnrollmentTerm = -Infinity;
    let lastTaughtTerm = 0;

    for (const [key, value] of Object.entries(raw.term_data ?? {})) {
        if (!/^\d+$/.test(key)) continue;
        const termNum = Number(key);
        if (value.enrollment_data || value.grade_data) {
            lastTaughtTerm = Math.max(lastTaughtTerm, termNum);
        }
        if (value.enrollment_data && termNum > latestEnrollmentTerm) {
            latestEnrollmentTerm = termNum;
            latestEnrollment = value.enrollment_data;
        }
    }

    // Use the precomputed cumulative distribution instead of re-summing terms.
    const avgGpa = raw.cumulative_grade_data
        ? averageGpa(raw.cumulative_grade_data)
        : null;

    const credits = latestEnrollment?.credit_count?.[1] ?? null;
    const genEd: string[] = [];
    if (latestEnrollment?.general_education) genEd.push("GenEd");
    if (latestEnrollment?.ethnics_studies) genEd.push("Ethnic Studies");

    return { credits, genEd, avgGpa, lastTaughtTerm };
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

function buildCourse(raw: RawCourse, rawMeetings: RawMeeting[] | null): Course | null {
    const ref = raw.course_reference;
    if (ref.course_number > MAX_COURSE_NUMBER) return null;

    const sections = rawMeetings ? buildSections(rawMeetings) : [];
    const { credits, genEd, avgGpa, lastTaughtTerm } = summarizeTerms(raw);

    // A course with live sections is clearly offered; otherwise require
    // recent teaching history so retired courses don't get suggested.
    if (sections.length === 0 && lastTaughtTerm < ACTIVE_SINCE_TERM) return null;

    const ast = raw.prerequisites?.abstract_syntax_tree;
    const tree = ast ? buildPrereqTree(ast, null) : true;

    const aliases = ref.subjects.slice(1).map((s) => `${s}${ref.course_number}`);

    const course: Course = {
        code: refToCode(ref),
        aliases: aliases.length ? aliases : undefined,
        name: raw.course_title,
        credits: credits ?? DEFAULT_CREDITS,
        difficulty: difficultyFromNumber(ref.course_number),
        tags: [...(raw.keywords ?? [])],
        breadth: BREADTH_BY_SUBJECT[ref.subjects[0]],
        genEd: genEd.length ? genEd : undefined,
        creditType: "L&S",
        prerequisites: [...collectCodes(tree, new Set())],
        prerequisiteTree: tree === true ? undefined : tree,
        prerequisiteText: raw.prerequisites ? prerequisiteText(raw.prerequisites) : undefined,
        sections,
        description: raw.description?.trim() || undefined,
        avgGpa: avgGpa ?? undefined,
        creditsEstimated: credits === null ? true : undefined,
    };

    return course;
}

// --- extract + load ---

function loadRawCourses(): Array<{ course: RawCourse; meetings: RawMeeting[] | null }> {
    const courseDir = path.join(UW_DATA_ROOT, "course");
    if (!fs.existsSync(courseDir)) {
        throw new Error(
            `No uw-coursemap-data at ${UW_DATA_ROOT}. Set UW_COURSEMAP_DATA or clone it as a sibling.`,
        );
    }

    const results: Array<{ course: RawCourse; meetings: RawMeeting[] | null }> = [];

    for (const entry of fs.readdirSync(courseDir)) {
        if (!entry.endsWith(".json")) continue;

        const stem = entry.replace(/\.json$/, "");
        const meetingsPath = path.join(courseDir, stem, "meetings.json");

        const course = JSON.parse(
            fs.readFileSync(path.join(courseDir, entry), "utf8"),
        ) as RawCourse;
        const meetings = fs.existsSync(meetingsPath)
            ? (JSON.parse(fs.readFileSync(meetingsPath, "utf8")) as RawMeeting[])
            : null;

        results.push({ course, meetings });
    }

    return results;
}

// Subject code -> department name ("COMPSCI" -> "Computer Sciences"), used
// to match a student's major to its courses.
function writeSubjectsJson(): void {
    const source = path.join(UW_DATA_ROOT, "subjects.json");
    if (!fs.existsSync(source)) {
        console.warn(`  No subjects.json at ${source}; skipping subject names.`);
        return;
    }
    const subjects = JSON.parse(fs.readFileSync(source, "utf8")) as Record<string, string>;
    const sorted = Object.fromEntries(Object.entries(subjects).sort(([a], [b]) => a.localeCompare(b)));
    fs.writeFileSync(SUBJECTS_OUTPUT_PATH, JSON.stringify(sorted, null, 2) + "\n");
    console.log(`Wrote ${Object.keys(sorted).length} subjects to ${SUBJECTS_OUTPUT_PATH}`);
}

// One course per line: compact for a ~5k-course catalog, but still diffable.
function writeCoursesJson(courses: Course[]): void {
    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    const lines = courses.map((c) => JSON.stringify(c));
    fs.writeFileSync(OUTPUT_PATH, `[\n${lines.join(",\n")}\n]\n`);
}

function main(): void {
    console.log(`Reading uw-coursemap-data from: ${UW_DATA_ROOT}`);
    const raws = loadRawCourses();
    console.log(`  Found ${raws.length} courses`);

    const courses: Course[] = [];
    for (const { course: raw, meetings } of raws) {
        const built = buildCourse(raw, meetings);
        if (built) courses.push(built);
    }

    // Keep output sorted so diffs are stable.
    courses.sort((a, b) => a.code.localeCompare(b.code));

    const timed = courses.filter((c) => c.sections.length > 0).length;
    const estimated = courses.filter((c) => c.creditsEstimated).length;
    writeCoursesJson(courses);
    writeSubjectsJson();
    console.log(
        `Wrote ${courses.length} courses (${timed} with meeting times, ` +
            `${estimated} with estimated credits) to ${OUTPUT_PATH}`,
    );
}

main();
