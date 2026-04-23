import { Router } from "express";
import type { SearchCriteria } from "../models/SearchCriteria";
import { courseRepository } from "../repositories/courseRepository";
import { getAvailableCourses } from "../services/coursePlanner";
import { rankCourses } from "../services/scoringService";
import { generateSchedules } from "../services/scheduleService";

const router = Router();

interface PlanRequestBody {
    completedCourses?: string[];
    criteria?: SearchCriteria;
}

// Cap on returned schedules — passed into generateSchedules so the
// backtracker short-circuits instead of exploring all 2^n combinations.
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

    const available = getAvailableCourses(courseRepository.listAll(), completed);
    const ranked = rankCourses(available, criteria);
    const schedules = generateSchedules(
        ranked,
        criteria.targetCreditsMin ?? 12,
        criteria.targetCreditsMax ?? 18,
        MAX_SCHEDULES,
    );

    res.json({
        totalFound: schedules.length,
        schedules,
    });
});

export default router;
