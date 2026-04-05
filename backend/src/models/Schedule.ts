import { Course, Section } from "./Course";

export type ScheduledCourse = {
    course: Course;
    section: Section;
};

export type Schedule = {
    courses: ScheduledCourse[];
    totalCredits: number;
};