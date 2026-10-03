import { describe, expect, it } from "vitest";
import { parseTranscript, plannerCourses, type TextItem, type TextPage } from "./parseTranscript";

// Synthetic transcript mirroring the real layout (column x positions, row
// spacing, wrapped lines). No real student data.

const LEFT = { course: 51, description: 140, attempted: 259, earned: 286, grade: 315, points: 341 };
const RIGHT = { course: 421, description: 510, attempted: 629, earned: 656, grade: 685, points: 711 };
type Cols = typeof LEFT;

const at = (x: number, y: number, str: string): TextItem => ({ x, y, str });

function header(c: Cols, y: number): TextItem[] {
    return [
        at(c.course, y, "Course"),
        at(c.description, y, "Description"),
        at(c.attempted - 13, y, "Attempted"),
        at(c.earned - 4, y, "Earned"),
        at(c.grade - 6, y, "Grade"),
        at(c.points + 2, y, "Points"),
    ];
}

function course(
    c: Cols,
    y: number,
    code: string,
    title: string,
    attempted: string,
    earned: string,
    grade: string | null,
    points: string,
): TextItem[] {
    const items = [
        at(c.course, y, code),
        at(c.description, y, title),
        at(c.attempted, y, attempted),
        at(c.earned, y, earned),
        at(c.points, y, points),
    ];
    if (grade) items.push(at(c.grade, y, grade));
    return items;
}

const page1: TextPage = {
    width: 792,
    items: [
        // Left half: term header with transfer credit on the right.
        at(181, 237, "Fall 2025-2026"),
        at(51, 244, "Program:"),
        // Right half: transfer block.
        at(420, 107, "Transfer Credit from Example College"),
        ...header(RIGHT, 120),
        ...course(RIGHT, 131, "MATH 221", "Calculus&Analytic Geometry 1", "5.000", "5.000", "T", "0.000"),
        // Course number wrapped onto its own line.
        ...course(RIGHT, 138, "COMP SCI", "Electives", "2.680", "2.680", "T", "0.000"),
        at(421, 145, "X12"),
        // Course number as a separate item on the same line.
        ...course(RIGHT, 152, "PSYCH", "Electives", "2.010", "2.010", "T", "0.000"),
        at(450, 152, "X19"),
        ...course(RIGHT, 159, "NO CRED X10", "No Credit", "0.000", "0.000", "T", "0.000"),
        at(558, 166, "Transfer Course Totals:"),
        at(630, 166, "9.690"),
    ],
};

const page2: TextPage = {
    width: 792,
    items: [
        // Left half: the Fall term's own UW courses.
        at(50, 115, "Session: Regular"),
        ...header(LEFT, 122),
        ...course(LEFT, 131, "COMP SCI 300", "Programming II", "3.000", "3.000", "A", "12.000"),
        ...course(LEFT, 138, "L I S 202", "Divides&Differences", "3.000", "3.000", "AB", "10.500"),
        ...course(LEFT, 145, "MATH 320", "Linear Algebra", "3.000", "0.000", "W", "0.000"),
        at(203, 155, "GPA"),
        at(229, 155, "Attempted"),
        at(109, 162, "UW-Madison Term Summary:"),
        at(238, 162, "6.000"),
        at(176, 292, "Spring 2025-2026"),
        at(50, 331, "Session: Regular"),
        ...header(LEFT, 338),
        // Retake of a W'd course.
        ...course(LEFT, 347, "MATH 320", "Linear Algebra", "3.000", "3.000", "B", "9.000"),
        // Right half: current term, no grades yet, wrapped title.
        at(551, 259, "Fall 2026-2027"),
        at(420, 298, "Session: Regular"),
        ...header(RIGHT, 305),
        ...course(RIGHT, 321, "COMP SCI 407", "Found of Mobl", "3.000", "0.000", null, "0.000"),
        at(510, 328, "Systms&Applctns"),
        ...course(RIGHT, 335, "E C E 354", "Machine Organization", "3.000", "0.000", null, "0.000"),
    ],
};

const { courses, summary } = parseTranscript([page1, page2]);
const byCode = (code: string) => courses.filter((c) => c.code === code);

describe("parseTranscript", () => {
    it("normalizes codes to catalog format", () => {
        expect(courses.map((c) => c.code)).toEqual([
            "MATH221",
            "COMPSCIX12",
            "PSYCHX19",
            "NOCREDX10",
            "COMPSCI300",
            "LIS202",
            "MATH320",
            "MATH320",
            "COMPSCI407",
            "ECE354",
        ]);
    });

    it("labels transfer blocks and returns to the term after a session line", () => {
        expect(byCode("MATH221")[0]).toMatchObject({
            isTransfer: true,
            term: "Transfer: Example College",
        });
        expect(byCode("COMPSCI300")[0]).toMatchObject({ isTransfer: false, term: "Fall 2025-2026" });
        expect(byCode("ECE354")[0].term).toBe("Fall 2026-2027");
    });

    it("joins wrapped course numbers and titles", () => {
        expect(byCode("COMPSCIX12")[0].displayCode).toBe("COMP SCI X12");
        expect(byCode("COMPSCI407")[0].title).toBe("Found of Mobl Systms&Applctns");
    });

    it("derives status from earned credits and grade", () => {
        expect(byCode("COMPSCI300")[0].status).toBe("completed");
        expect(byCode("MATH320").map((c) => c.status)).toEqual(["not-earned", "completed"]);
        expect(byCode("NOCREDX10")[0].status).toBe("not-earned");
        expect(byCode("COMPSCI407")[0].status).toBe("in-progress");
    });

    it("flags X-numbered transfer credit as elective credit", () => {
        expect(byCode("COMPSCIX12")[0].isElectiveCredit).toBe(true);
        expect(byCode("PSYCHX19")[0].isElectiveCredit).toBe(true);
        expect(byCode("MATH221")[0].isElectiveCredit).toBe(false);
    });

    it("totals earned and in-progress credits", () => {
        expect(summary).toEqual({
            earnedCredits: 18.69,
            uwCredits: 9,
            transferCredits: 9.69,
            inProgressCredits: 6,
        });
    });
});

describe("plannerCourses", () => {
    it("keeps real, earned or in-progress courses once each", () => {
        expect(plannerCourses(courses).map((c) => c.code)).toEqual([
            "MATH221",
            "COMPSCI300",
            "LIS202",
            "MATH320",
            "COMPSCI407",
            "ECE354",
        ]);
    });
});
