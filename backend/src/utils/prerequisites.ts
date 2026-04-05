import { Course } from "../models/Course";

export function canTakeCourse(course: Course, completedCourses: Set<string>): boolean {
    return course.prerequisites.every((prereq) => completedCourses.has(prereq));
}