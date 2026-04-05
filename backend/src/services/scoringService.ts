import { Course } from "../models/Course";
import { SearchCriteria } from "../models/SearchCriteria";

export function scoreCourse(course: Course, criteria: SearchCriteria): number {
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

    // Needed breadth match
    if (
        criteria.neededBreadth &&
        course.breadth &&
        criteria.neededBreadth.includes(course.breadth)
    ) {
        score += 5;
    }

    // Needed gen ed match
    if (criteria.neededGenEd && course.genEd) {
        for (const genEd of course.genEd) {
            if (criteria.neededGenEd.includes(genEd)) {
                score += 5;
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

export function rankCourses(courses: Course[], criteria: SearchCriteria): Course[] {
    return [...courses].sort((a, b) => scoreCourse(b, criteria) - scoreCourse(a, criteria));
}