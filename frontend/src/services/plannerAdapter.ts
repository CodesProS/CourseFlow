import type { Schedule } from "@backend/models/Schedule";
import type { SearchCriteria } from "@backend/models/SearchCriteria";

import { courses } from "@backend/data/courses";
import { getAvailableCourses } from "@backend/services/coursePlanner";
import { rankCourses } from "@backend/services/scoringService";
import { generateSchedules } from "@backend/services/scheduleService";

export type PlannerInput = {
    completedCourses: string[];
    criteria: SearchCriteria;
};

export function runPlanner(input: PlannerInput): Schedule[] {
    const completedSet = new Set(input.completedCourses.map((code) => code.trim()));

    const availableCourses = getAvailableCourses(courses, completedSet);
    const rankedCourses = rankCourses(availableCourses, input.criteria);

    return generateSchedules(
        rankedCourses,
        input.criteria.targetCreditsMin ?? 12,
        input.criteria.targetCreditsMax ?? 18
    );
}