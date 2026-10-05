import { Course } from "../models/Course";
import { SearchCriteria } from "../models/SearchCriteria";
import { canTakeCourse } from "../utils/prerequisites";
import { rankCourses } from "./scoringService";

/**
 * Finds all courses that a student is currently eligible to enroll in.
 * 
 * To be "available," a course must:
 * 1. Not already be in the student's 'completedCourses' list.
 * 2. Have its prerequisite rule (AND/OR of courses) satisfied by 'completedCourses'.
 * 
 * @param allCourses - The full array of Course objects from the database/data file.
 * @param completedCourses - A Set of course codes (e.g., "CS200") that the student has finished.
 * @returns An array of Course objects that the student can take next.
 */
export function getAvailableCourses(
    allCourses: Course[],
    completedCourses: Set<string>
): Course[] {
    return allCourses.filter((course) => {
        const alreadyCompleted = completedCourses.has(course.code);
        const meetsPrereqs = canTakeCourse(course, completedCourses);

        return !alreadyCompleted && meetsPrereqs;
    });
}

/**
 * Adds every code a completed course goes by, so "ECE354" from a transcript
 * also counts as COMPSCI354 (and vice versa) for prerequisites.
 */
export function expandCrossListed(allCourses: Course[], completed: Set<string>): Set<string> {
    const expanded = new Set(completed);
    for (const course of allCourses) {
        const codes = [course.code, ...(course.aliases ?? [])];
        if (codes.some((code) => completed.has(code))) codes.forEach((code) => expanded.add(code));
    }
    return expanded;
}

// The search is exponential in the number of courses, so it only considers
// the best-ranked ones. Thousands of eligible courses would never finish;
// 40 keeps a request well under a second.
export const MAX_CANDIDATES = 40;

/**
 * The courses the schedule search should consider: eligible, within the
 * difficulty cap, best matches first, at most `limit` of them.
 *
 * Locked courses are always included, even if they'd otherwise be filtered
 * out (unmet prerequisites, too difficult): the student asked for them.
 * Excluded courses never are.
 */
export function selectCandidates(
    allCourses: Course[],
    completedCourses: Set<string>,
    criteria: SearchCriteria,
    limit: number = MAX_CANDIDATES
): Course[] {
    const codesOf = (c: Course) => [c.code, ...(c.aliases ?? [])];
    const lockedCodes = new Set(criteria.lockedCourses ?? []);
    const excludedCodes = new Set(criteria.excludedCourses ?? []);
    const isLocked = (c: Course) => codesOf(c).some((code) => lockedCodes.has(code));
    const isExcluded = (c: Course) => codesOf(c).some((code) => excludedCodes.has(code));
    const locked = allCourses.filter((c) => isLocked(c) && !isExcluded(c));

    const completed = expandCrossListed(allCourses, completedCourses);
    const eligible = getAvailableCourses(allCourses, completed).filter(
        (c) =>
            !isLocked(c) &&
            !isExcluded(c) &&
            (criteria.maxDifficulty === undefined || c.difficulty <= criteria.maxDifficulty),
    );
    return [...locked, ...rankCourses(eligible, criteria).slice(0, Math.max(0, limit - locked.length))];
}
