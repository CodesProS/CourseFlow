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

// Cap on returned schedules. generateSchedules is O(2^n) worst case so
// the backtracker can still blow up internally — this just keeps the
// response small. TODO: push the cap into the backtracker itself.
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
    );

    res.json({
        totalFound: schedules.length,
        schedules: schedules.slice(0, MAX_SCHEDULES),
    });
});

export default router;
