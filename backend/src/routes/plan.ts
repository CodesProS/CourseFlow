import { Router } from "express";
import type { SearchCriteria } from "../models/SearchCriteria";
import { courseRepository } from "../repositories/courseRepository";
import { planSchedules } from "../services/coursePlanner";

const router = Router();

interface PlanRequestBody {
    completedCourses?: string[];
    criteria?: SearchCriteria;
}

// Number of top-scoring schedules to return.
const MAX_SCHEDULES = 50;

// POST /plan — body: { completedCourses?, criteria? }
router.post("/", (req, res) => {
    const body: PlanRequestBody =
        typeof req.body === "object" && req.body !== null ? req.body : {};

    const completedList = Array.isArray(body.completedCourses)
        ? body.completedCourses.filter((c): c is string => typeof c === "string")
        : [];
    const completed = new Set(completedList.map((c) => c.trim()));

    const criteria: SearchCriteria =
        typeof body.criteria === "object" && body.criteria !== null
            ? body.criteria
            : {};

    const schedules = planSchedules(courseRepository.listAll(), completed, criteria, MAX_SCHEDULES);

    res.json({
        totalFound: schedules.length,
        schedules,
    });
});

export default router;
