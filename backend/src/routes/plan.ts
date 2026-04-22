/**
 * /plan route.
 *
 * Wraps the planning pipeline (filter -> rank -> backtrack) behind a
 * single HTTP endpoint. The frontend POSTs a small payload and gets
 * back a ranked list of conflict-free schedules.
 */

import { Router } from "express";
import type { SearchCriteria } from "../models/SearchCriteria";
import { courseRepository } from "../repositories/courseRepository";
import { getAvailableCourses } from "../services/coursePlanner";
import { rankCourses } from "../services/scoringService";
import { generateSchedules } from "../services/scheduleService";

const router = Router();

/**
 * Expected request shape. Defensive: every field is optional because
 * we'll fill in sensible defaults.
 */
interface PlanRequestBody {
    completedCourses?: string[];
    criteria?: SearchCriteria;
}

/** Maximum schedules returned per request. Protects against combinatorial
 * blowup on large catalogs — generateSchedules() is O(2^n) worst case.
 * We could alternatively time-budget the backtracker, but a hard cap is
 * simpler and still gives the UI plenty to show. */
const MAX_SCHEDULES = 50;

/**
 * POST /plan
 *
 * Body:  { completedCourses?: string[], criteria?: SearchCriteria }
 * Reply: { totalFound: number, schedules: Schedule[] }
 */
router.post("/", (req, res) => {
    // Defensive parsing — trust nothing from the wire. If the frontend
    // sends malformed JSON, Express's express.json() middleware will
    // have already 400'd before we reach here; we only need to handle
    // well-formed-JSON-but-wrong-shape cases.
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

    const allCourses = courseRepository.listAll();
    const available = getAvailableCourses(allCourses, completed);
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
