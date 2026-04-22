/**
 * Course repository.
 *
 * A repository is the seam between your application code and your data
 * source. The idea is that *services and routes* should never know
 * whether the courses live in memory, in SQLite, in Postgres, or in a
 * remote API — they just call `repo.listAll()` and trust the contract.
 *
 * This is the "repository pattern," one of the most useful abstractions
 * in backend code. It gives you:
 *   - Testability: swap in a fake repo that returns fixture data.
 *   - Swappability: migrate from in-memory to SQLite later without
 *     touching any downstream code.
 *   - Single point of access: query optimizations, caching, logging all
 *     live in one place.
 */

import type { Course } from "../models/Course";
import { courses as loadedCourses } from "../data/courses";

/** The contract. Implementations can vary; callers shouldn't care. */
export interface CourseRepository {
    listAll(): Course[];
    findByCode(code: string): Course | undefined;
}

/**
 * In-memory implementation. Takes the full catalog once at
 * construction and builds a code->course index for O(1) lookups.
 * Good enough for a 54-course MVP; a real product with 10k+ courses
 * would use SQLite + an index on `code`.
 */
export class InMemoryCourseRepository implements CourseRepository {
    private readonly courses: Course[];
    private readonly byCode: Map<string, Course>;

    constructor(courses: Course[]) {
        this.courses = courses;
        this.byCode = new Map(courses.map((c) => [c.code, c]));
    }

    listAll(): Course[] {
        // Return a copy? For MVP, returning the live array is fine —
        // callers don't mutate it. In a larger codebase, `structuredClone`
        // or readonly types would prevent accidental mutation.
        return this.courses;
    }

    findByCode(code: string): Course | undefined {
        return this.byCode.get(code);
    }
}

/**
 * Module-level singleton. Every route/service imports this same
 * instance. If we wanted proper dependency injection, we'd construct
 * the repo in `server.ts` and thread it through to each route handler —
 * that's overkill for MVP but a natural next step.
 */
export const courseRepository: CourseRepository = new InMemoryCourseRepository(loadedCourses);
