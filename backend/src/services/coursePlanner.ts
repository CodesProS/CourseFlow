import { Course } from "../models/Course";
import { canTakeCourse } from "../utils/prerequisites";

/**
 * Finds all courses that a student is currently eligible to enroll in.
 * 
 * To be "available," a course must:
 * 1. Not already be in the student's 'completedCourses' list.
 * 2. Have all of its prerequisites present in the 'completedCourses' list.
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