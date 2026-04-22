/**
 * Catalog source of truth for the backend.
 *
 * The data is produced by `npm run ingest`, which reads a local clone
 * of uw-coursemap-data and writes `backend/data/courses.json` in our
 * Course[] shape. This module just imports that JSON and re-exports it
 * as the typed `courses` array, so the rest of the backend stays
 * unchanged whether the data is 14 hand-written records or thousands
 * from the ingest pipeline.
 *
 * If courses.json is missing (e.g. on a fresh clone before running
 * ingest), fall back to an empty array with a warning. The app will
 * still boot; it just won't have anything to schedule.
 */

import * as fs from "fs";
import * as path from "path";
import type { Course } from "../models/Course";

const COURSES_JSON = path.resolve(__dirname, "../../data/courses.json");

function loadCourses(): Course[] {
    if (!fs.existsSync(COURSES_JSON)) {
        console.warn(
            `[courses] ${COURSES_JSON} missing. Run \`npm run ingest\` to populate it.`,
        );
        return [];
    }
    const raw = fs.readFileSync(COURSES_JSON, "utf8");
    return JSON.parse(raw) as Course[];
}

export const courses: Course[] = loadCourses();
