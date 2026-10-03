// Parses a UW-Madison transcript PDF's text into courses and credit totals.
//
// The transcript is a landscape page with two independent halves (left,
// then right), each holding a run of term blocks:
//
//   Fall 2025-2026                         <- term header
//   Course  Description  Attempted  Earned  Grade  Points   <- table header
//   COMP SCI 300  Programming II  3.000  3.000  A  12.000   <- course row
//
// Transfer credit is posted inside a term as "Transfer Credit from <school>"
// blocks; the term's own UW courses follow under a "Session: ..." line.
// Text is positioned, not structured, so we rebuild rows by y and assign
// cells to whichever header column they sit closest to.

export type TextItem = { x: number; y: number; str: string };
export type TextPage = { width: number; items: TextItem[] };

export type CourseStatus = "completed" | "in-progress" | "not-earned";

export type TranscriptCourse = {
    code: string; // catalog format, e.g. "COMPSCI300"
    displayCode: string; // as printed, e.g. "COMP SCI 300"
    title: string;
    term: string;
    attempted: number;
    earned: number;
    grade: string | null;
    gradePoints: number;
    status: CourseStatus;
    isTransfer: boolean;
    // "COMP SCI X12" — generic credit in a subject, not a real course, so it
    // counts toward credits but can't satisfy a prerequisite.
    isElectiveCredit: boolean;
};

export type TranscriptSummary = {
    earnedCredits: number;
    uwCredits: number;
    transferCredits: number;
    inProgressCredits: number;
    gpa: number | null;
};

export type ParsedTranscript = {
    courses: TranscriptCourse[];
    summary: TranscriptSummary;
};

type Row = { y: number; items: TextItem[] };
type Column = "course" | "description" | "attempted" | "earned" | "grade" | "points";

const COLUMN_HEADERS: Record<string, Column> = {
    Course: "course",
    Description: "description",
    Attempted: "attempted",
    Earned: "earned",
    Grade: "grade",
    Points: "points",
};

const TERM_RE = /^(Fall|Spring|Summer) \d{4}(-\d{4})?$/;
const TRANSFER_RE = /^Transfer Credit from (.+)$/;
const SESSION_RE = /^Session:/;
// Subject, optionally followed by a course number: "COMP SCI 300", "L I S 202",
// "CHEM X01", or just "COMP SCI" when the number wraps onto the next line.
const COURSE_CODE_RE = /^[A-Z][A-Z &]*?( X?\d{2,3})?$/;
const COURSE_NUMBER_RE = /^X?\d{2,3}$/;
const ELECTIVE_RE = /\sX\d+$/;

// Letter grades that count toward GPA (UW scale).
const GPA_GRADES = new Set(["A", "AB", "B", "BC", "C", "D", "F"]);

const ROW_TOLERANCE = 2;

function groupRows(items: TextItem[]): Row[] {
    const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
    const rows: Row[] = [];
    for (const item of sorted) {
        const last = rows[rows.length - 1];
        if (last && Math.abs(last.y - item.y) <= ROW_TOLERANCE) {
            last.items.push(item);
        } else {
            rows.push({ y: item.y, items: [item] });
        }
    }
    for (const row of rows) row.items.sort((a, b) => a.x - b.x);
    return rows;
}

function rowText(row: Row): string {
    return row.items.map((i) => i.str).join(" ");
}

function readHeader(row: Row): Map<Column, number> | null {
    const columns = new Map<Column, number>();
    for (const item of row.items) {
        const column = COLUMN_HEADERS[item.str];
        if (column) columns.set(column, item.x);
    }
    return columns.has("course") && columns.has("grade") ? columns : null;
}

// Values are right-aligned under their headers, so nearest-x is reliable.
function cellsByColumn(row: Row, columns: Map<Column, number>): Map<Column, string> {
    const cells = new Map<Column, string>();
    for (const item of row.items) {
        let best: Column | null = null;
        let bestDistance = Infinity;
        for (const [column, x] of columns) {
            const distance = Math.abs(item.x - x);
            if (distance < bestDistance) {
                best = column;
                bestDistance = distance;
            }
        }
        if (best) {
            const prev = cells.get(best);
            cells.set(best, prev ? `${prev} ${item.str}` : item.str);
        }
    }
    return cells;
}

function toNumber(value: string | undefined): number {
    const n = Number.parseFloat(value ?? "");
    return Number.isFinite(n) ? n : 0;
}

function round(n: number): number {
    return Math.round(n * 1000) / 1000;
}

function statusOf(earned: number, grade: string | null): CourseStatus {
    if (earned > 0) return "completed";
    // Current-term courses are listed with attempted credits but no grade yet.
    if (!grade) return "in-progress";
    return "not-earned"; // F, W, DR, no-credit transfer, ...
}

export function parseTranscript(pages: TextPage[]): ParsedTranscript {
    const courses: TranscriptCourse[] = [];
    let term = "";
    let transferFrom: string | null = null;

    // Read order: page 1 left, page 1 right, page 2 left, ... A term that
    // starts at the bottom of one half continues at the top of the next.
    const halves = pages.flatMap((page) => {
        const mid = page.width / 2;
        return [
            page.items.filter((i) => i.x < mid),
            page.items.filter((i) => i.x >= mid),
        ];
    });

    for (const half of halves) {
        let columns: Map<Column, number> | null = null;
        let current: TranscriptCourse | null = null;

        for (const row of groupRows(half)) {
            const text = rowText(row);

            const transferMatch = TRANSFER_RE.exec(text);
            if (TERM_RE.test(text) || transferMatch || SESSION_RE.test(text)) {
                if (TERM_RE.test(text)) term = text;
                transferFrom = transferMatch ? transferMatch[1] : null;
                columns = null;
                current = null;
                continue;
            }

            const header = readHeader(row);
            if (header) {
                columns = header;
                current = null;
                continue;
            }

            if (!columns) continue;

            const cells = cellsByColumn(row, columns);
            const code = cells.get("course");
            const onlyDescription = cells.size === 1 && cells.has("description");

            // Wrapped lines: a long title, or a course number pushed below
            // its subject ("COMP SCI" / "X12").
            if (current && onlyDescription) {
                current.title = `${current.title} ${cells.get("description")}`;
                continue;
            }
            if (current && cells.size === 1 && code && COURSE_NUMBER_RE.test(code)) {
                current.displayCode = `${current.displayCode} ${code}`;
                continue;
            }

            if (!code || !COURSE_CODE_RE.test(code)) {
                // Anything else (term summary, session line, totals) ends the table.
                columns = null;
                current = null;
                continue;
            }

            const earned = toNumber(cells.get("earned"));
            const grade = cells.get("grade") ?? null;
            current = {
                code: "",
                displayCode: code,
                title: cells.get("description") ?? "",
                term: transferFrom ? `Transfer: ${transferFrom}` : term,
                attempted: toNumber(cells.get("attempted")),
                earned,
                grade,
                gradePoints: toNumber(cells.get("points")),
                status: statusOf(earned, grade),
                isTransfer: transferFrom !== null,
                isElectiveCredit: false,
            };
            courses.push(current);
        }
    }

    for (const course of courses) {
        course.code = course.displayCode.replace(/\s+/g, "");
        course.isElectiveCredit = ELECTIVE_RE.test(course.displayCode);
    }

    return { courses, summary: summarize(courses) };
}

function summarize(courses: TranscriptCourse[]): TranscriptSummary {
    let uwCredits = 0;
    let transferCredits = 0;
    let inProgressCredits = 0;
    let gpaUnits = 0;
    let gradePoints = 0;

    for (const c of courses) {
        if (c.isTransfer) transferCredits += c.earned;
        else uwCredits += c.earned;

        if (c.status === "in-progress") inProgressCredits += c.attempted;

        if (!c.isTransfer && c.grade && GPA_GRADES.has(c.grade)) {
            gpaUnits += c.attempted;
            gradePoints += c.gradePoints;
        }
    }

    return {
        earnedCredits: round(uwCredits + transferCredits),
        uwCredits: round(uwCredits),
        transferCredits: round(transferCredits),
        inProgressCredits: round(inProgressCredits),
        gpa: gpaUnits > 0 ? round(gradePoints / gpaUnits) : null,
    };
}

// Distinct course codes a student has credit for (or is taking now), for the
// planner's completed-courses list. Elective credit isn't a real course.
export function plannerCourses(courses: TranscriptCourse[]): TranscriptCourse[] {
    const byCode = new Map<string, TranscriptCourse>();
    for (const c of courses) {
        if (c.isElectiveCredit || c.status === "not-earned") continue;
        const existing = byCode.get(c.code);
        // A repeated course: keep the completed attempt over an in-progress one.
        if (!existing || (existing.status !== "completed" && c.status === "completed")) {
            byCode.set(c.code, c);
        }
    }
    return [...byCode.values()];
}
