import { Course } from "../models/Course";
import { Schedule, ScheduledCourse } from "../models/Schedule";
import { canAddSection } from "../utils/scheduleUtils";

// Backtracker is O(2^n) worst case. With 54 eligible courses and no filters
// it produces ~500k valid schedules before we trim. Cap inside the recursion
// so empty queries don't melt a 256MB container.
const DEFAULT_MAX_RESULTS = 50;

export function generateSchedules(
    courses: Course[],
    targetCreditsMin: number,
    targetCreditsMax: number,
    maxResults: number = DEFAULT_MAX_RESULTS
): Schedule[] {
    const validSchedules: Schedule[] = [];

    function backtrack(
        startIndex: number,
        currentScheduledCourses: ScheduledCourse[],
        currentCredits: number
    ): void {
        // Bail out of the entire search once we've hit the cap. Because
        // `courses` is pre-ranked by the scorer, the first N found are
        // already the N best — no need to keep exploring.
        if (validSchedules.length >= maxResults) return;

        if (currentCredits > targetCreditsMax) {
            return;
        }

        if (
            currentCredits >= targetCreditsMin &&
            currentCredits <= targetCreditsMax
        ) {
            validSchedules.push({
                courses: [...currentScheduledCourses],
                totalCredits: currentCredits,
            });
        }

        for (let i = startIndex; i < courses.length; i++) {
            if (validSchedules.length >= maxResults) return;

            const course = courses[i];

            for (const section of course.sections) {
                if (!canAddSection(currentScheduledCourses, section)) {
                    continue;
                }

                currentScheduledCourses.push({ course, section });

                backtrack(
                    i + 1,
                    currentScheduledCourses,
                    currentCredits + course.credits
                );

                currentScheduledCourses.pop();
            }
        }
    }

    backtrack(0, [], 0);
    return validSchedules;
}
