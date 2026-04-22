/**
 * /courses routes.
 *
 * In Express, a `Router` is a mini-app: a grouping of related endpoints
 * that share a URL prefix (see server.ts, where we mount this at
 * "/courses"). Splitting routes by resource keeps the file size sane
 * and mirrors how the URL is organized.
 */

import { Router } from "express";
import { courseRepository } from "../repositories/courseRepository";

const router = Router();

/**
 * GET /courses
 *
 * Returns the full catalog. For MVP we return everything in one shot —
 * 54 courses, ~50 KB of JSON, trivially small. In a real product with
 * thousands of courses you'd paginate (?limit=&offset=) and add filter
 * query params (?subject=COMPSCI&maxCredits=4).
 */
router.get("/", (_req, res) => {
    res.json(courseRepository.listAll());
});

/**
 * GET /courses/meta
 *
 * Returns the distinct breadth, gen-ed, and tag values present in the
 * current catalog. This is what the frontend will query to populate
 * autocomplete dropdowns, so the user picks real-valued options rather
 * than typing free text. Computed on every request — fine for 54
 * courses; if it got slow we'd cache it in memory on startup.
 */
router.get("/meta", (_req, res) => {
    const all = courseRepository.listAll();

    const breadths = new Set<string>();
    const genEds = new Set<string>();
    const tags = new Set<string>();

    for (const c of all) {
        if (c.breadth) breadths.add(c.breadth);
        c.genEd?.forEach((g) => genEds.add(g));
        c.tags.forEach((t) => tags.add(t));
    }

    res.json({
        breadths: [...breadths].sort(),
        genEds: [...genEds].sort(),
        tags: [...tags].sort(),
    });
});

export default router;
