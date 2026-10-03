import { Course, Section } from "./Course";

export type ScheduledCourse = {
    course: Course;
    section: Section | null; // null: the course has no listed meeting times
};

export type Schedule = {
    courses: ScheduledCourse[];
    totalCredits: number;
    score?: number; // schedule-level score; each needed requirement counts once
};
