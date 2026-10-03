// Subject code -> department name, written by `npm run ingest` alongside
// courses.json. Optional: without it, majors just don't boost anything.

import * as fs from "fs";
import * as path from "path";

const SUBJECTS_JSON = path.resolve(__dirname, "../../data/subjects.json");

function loadSubjects(): Record<string, string> {
    if (!fs.existsSync(SUBJECTS_JSON)) return {};
    return JSON.parse(fs.readFileSync(SUBJECTS_JSON, "utf8")) as Record<string, string>;
}

export const subjects: Record<string, string> = loadSubjects();
