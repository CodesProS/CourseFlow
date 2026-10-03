import { Router } from "express";
import { courseRepository } from "../repositories/courseRepository";

const router = Router();

// The preferred-tags picker shows the most common tags; the full set is
// tens of thousands of one-off keyword fragments.
const MAX_META_TAGS = 300;

// GET /courses — code and name of every course, for the completed-courses
// picker. Full records (sections, descriptions) come back with /plan
// results; shipping them all here would be megabytes.
router.get("/", (_req, res) => {
    res.json(
        courseRepository.listAll().map((c) => ({
            code: c.code,
            name: c.name,
            aliases: c.aliases,
        })),
    );
});

// GET /courses/meta — distinct breadth/genEd values and the most common
// tags for the UI autocompletes. Recomputed each request; cheap enough.
router.get("/meta", (_req, res) => {
    const all = courseRepository.listAll();

    const breadths = new Set<string>();
    const genEds = new Set<string>();
    const tagCounts = new Map<string, number>();

    for (const c of all) {
        if (c.breadth) breadths.add(c.breadth);
        c.genEd?.forEach((g) => genEds.add(g));
        c.tags.forEach((t) => tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1));
    }

    const tags = [...tagCounts]
        .sort(([a, x], [b, y]) => y - x || a.localeCompare(b))
        .slice(0, MAX_META_TAGS)
        .map(([tag]) => tag)
        .sort();

    res.json({
        breadths: [...breadths].sort(),
        genEds: [...genEds].sort(),
        tags,
    });
});

export default router;
