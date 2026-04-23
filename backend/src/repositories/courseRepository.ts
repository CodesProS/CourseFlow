// Repository layer for courses. Keeps the data source behind an
// interface so routes/services don't care whether it's in-memory,
// SQLite, or Postgres. Swap implementations without touching callers.

import type { Course } from "../models/Course";
import { courses as loadedCourses } from "../data/courses";

export interface CourseRepository {
    listAll(): Course[];
    findByCode(code: string): Course | undefined;
}

export class InMemoryCourseRepository implements CourseRepository {
    private readonly courses: Course[];
    private readonly byCode: Map<string, Course>;

    constructor(courses: Course[]) {
        this.courses = courses;
        this.byCode = new Map(courses.map((c) => [c.code, c]));
    }

    listAll(): Course[] {
        return this.courses;
    }

    findByCode(code: string): Course | undefined {
        return this.byCode.get(code);
    }
}

// Module singleton. If we ever want proper DI, construct this in
// server.ts and thread it through.
export const courseRepository: CourseRepository = new InMemoryCourseRepository(loadedCourses);
