import { subjects } from "../data/subjects";
import { Course } from "../models/Course";
import { SearchCriteria } from "../models/SearchCriteria";

export const REQUIREMENT_POINTS = 5;
const INTEREST_IN_TITLE_POINTS = 3; // interest appears in the name or tags
const INTEREST_IN_DESCRIPTION_POINTS = 1; // only in the description
const PREFERRED_TAG_POINTS = 2;
const MAJOR_SUBJECT_POINTS = 2; // course is offered by the student's major department

// Common abbreviations students type, expanded to how catalogs phrase them.
const SYNONYMS: Record<string, string[]> = {
    ai: ["artificial intelligence"],
    ml: ["machine learning"],
    hci: ["human-computer interaction", "human computer interaction"],
    os: ["operating systems"],
    db: ["database"],
    ui: ["user interface"],
    nlp: ["natural language processing"],
};

function escapeRegExp(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Whole-word, case-insensitive, tolerant of a plural: "system" matches
// "systems" and vice versa.
function termPattern(term: string): RegExp {
    const stem = term.replace(/(es|s)$/i, "");
    return new RegExp(`\\b${escapeRegExp(stem)}(s|es)?\\b`, "i");
}

function interestPatterns(interest: string): RegExp[] {
    const term = interest.trim().toLowerCase();
    if (!term) return [];
    return [term, ...(SYNONYMS[term] ?? [])].map(termPattern);
}

// Degree suffixes on a major ("Computer Sciences BS") that aren't part of
// the department name.
const DEGREE_SUFFIX = /\s+(BA|BS|BSE|BM|BFA|BSN|BBA|AMEP|Certificate)$/i;

const majorSubjectsCache = new Map<string, Set<string>>();

// "Computer Sciences BS" -> {"COMPSCI"}: subjects whose department name is
// the major's name. Empty when nothing matches; then majors don't score.
export function majorSubjects(major: string | undefined): Set<string> {
    const name = major?.trim().replace(DEGREE_SUFFIX, "").toLowerCase();
    if (!name) return new Set();
    let found = majorSubjectsCache.get(name);
    if (!found) {
        found = new Set(
            Object.entries(subjects)
                .filter(([, department]) => department.toLowerCase() === name)
                .map(([code]) => code),
        );
        majorSubjectsCache.set(name, found);
    }
    return found;
}

// "COMPSCI354" (also "ECE354") -> ["COMPSCI", "ECE"]
function courseSubjects(course: Course): string[] {
    return [course.code, ...(course.aliases ?? [])].map((code) => code.replace(/\d+$/, ""));
}

// Points that belong to the course itself and add up across a schedule.
// Only actual matches score, so a schedule can't win just by holding more
// courses.
export function preferenceScore(course: Course, criteria: SearchCriteria): number {
    let score = 0;
    const title = `${course.name} ${course.tags.join(" ")}`;
    const description = course.description ?? "";

    for (const interest of criteria.interests ?? []) {
        const patterns = interestPatterns(interest);
        if (patterns.some((re) => re.test(title))) score += INTEREST_IN_TITLE_POINTS;
        else if (patterns.some((re) => re.test(description))) score += INTEREST_IN_DESCRIPTION_POINTS;
    }

    const tags = new Set(course.tags.map((t) => t.toLowerCase()));
    for (const tag of criteria.preferredTags ?? []) {
        if (tags.has(tag.toLowerCase())) score += PREFERRED_TAG_POINTS;
    }

    const major = majorSubjects(criteria.major);
    if (courseSubjects(course).some((subject) => major.has(subject))) {
        score += MAJOR_SUBJECT_POINTS;
    }

    return score;
}

// Needed breadth/gen-ed requirements this course fills, as stable keys.
// A schedule should only earn each requirement once, so the scheduler
// tracks these separately instead of summing them per course.
export function requirementsFilled(course: Course, criteria: SearchCriteria): string[] {
    const filled: string[] = [];

    // Needed breadth match
    if (
        criteria.neededBreadth &&
        course.breadth &&
        criteria.neededBreadth.includes(course.breadth)
    ) {
        filled.push(`breadth:${course.breadth}`);
    }

    // Needed gen ed match
    if (criteria.neededGenEd && course.genEd) {
        for (const genEd of course.genEd) {
            if (criteria.neededGenEd.includes(genEd)) {
                filled.push(`genEd:${genEd}`);
            }
        }
    }

    return filled;
}

export function scoreCourse(course: Course, criteria: SearchCriteria): number {
    return (
        preferenceScore(course, criteria) +
        REQUIREMENT_POINTS * requirementsFilled(course, criteria).length
    );
}

export function rankCourses(courses: Course[], criteria: SearchCriteria): Course[] {
    const scores = new Map(courses.map((c) => [c, scoreCourse(c, criteria)]));
    return [...courses].sort(
        (a, b) =>
            scores.get(b)! - scores.get(a)! ||
            // Among equals, prefer courses we can actually place on the
            // timetable.
            Number(b.sections.length > 0) - Number(a.sections.length > 0),
    );
}
