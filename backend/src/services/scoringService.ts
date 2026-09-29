import { Course } from "../models/Course";
import { SearchCriteria } from "../models/SearchCriteria";

export const REQUIREMENT_POINTS = 5;

// Points that belong to the course itself and add up linearly across a
// schedule: interests, preferred tags, difficulty.
export function preferenceScore(course: Course, criteria: SearchCriteria): number {
    let score = 0;

    // Interest match
    if (criteria.interests) {
        for (const interest of criteria.interests) {
            if (course.tags.includes(interest)) {
                score += 3;
            }
        }
    }

    // Preferred tags match
    if (criteria.preferredTags) {
        for (const tag of criteria.preferredTags) {
            if (course.tags.includes(tag)) {
                score += 2;
            }
        }
    }

    // Difficulty preference
    if (criteria.maxDifficulty !== undefined) {
        if (course.difficulty <= criteria.maxDifficulty) {
            score += 2;
        } else {
            score -= 3;
        }
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
    return [...courses].sort((a, b) => scores.get(b)! - scores.get(a)!);
}
