import { Router } from "express";
import { courseRepository } from "../repositories/courseRepository";

const router = Router();

// GET /courses — full catalog. Small enough to ship in one shot for now.
// TODO: paginate once the catalog grows past a few hundred.
router.get("/", (_req, res) => {
    res.json(courseRepository.listAll());
});

// GET /courses/meta — distinct breadth/genEd/tag values for the UI
// autocompletes. Recomputed each request; trivial at this size.
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
