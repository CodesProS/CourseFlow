import { Course } from "../models/Course";
import { Schedule, ScheduledCourse } from "../models/Schedule";
import { canAddSection } from "../utils/scheduleUtils";

export function generateSchedules(
    courses: Course[],
    targetCreditsMin: number,
    targetCreditsMax: number
): Schedule[] {
    const validSchedules: Schedule[] = [];

    function backtrack(
        startIndex: number,
        currentScheduledCourses: ScheduledCourse[],
        currentCredits: number
    ): void {
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