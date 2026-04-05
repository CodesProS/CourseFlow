import { courses } from "./data/courses";
import { SearchCriteria } from "./models/SearchCriteria";
import { getAvailableCourses } from "./services/coursePlanner";
import { rankCourses, scoreCourse } from "./services/scoringService";
import { generateSchedules } from "./services/scheduleService";

const completedCourses = new Set<string>(["CS200", "MATH221"]);

const criteria: SearchCriteria = {
    neededBreadth: ["Humanities"],
    neededGenEd: ["Ethnic Studies"],
    interests: ["AI", "Systems"],
    maxDifficulty: 2,
    targetCreditsMin: 12,
    targetCreditsMax: 15,
};

const availableCourses = getAvailableCourses(courses, completedCourses);

console.log("Available courses:");
for (const course of availableCourses) {
    console.log(
        `${course.code} - ${course.name} | score: ${scoreCourse(course, criteria)}`
    );
}

const rankedCourses = rankCourses(availableCourses, criteria);

console.log("\nRanked courses:");
for (const course of rankedCourses) {
    console.log(
        `${course.code} - ${course.name} | score: ${scoreCourse(course, criteria)}`
    );
}

const schedules = generateSchedules(
    rankedCourses,
    criteria.targetCreditsMin ?? 12,
    criteria.targetCreditsMax ?? 15
);

console.log(`\nGenerated ${schedules.length} valid schedules:\n`);

schedules.forEach((schedule, index) => {
    console.log(`================ Schedule ${index + 1} ================`);
    console.log(`Total Credits: ${schedule.totalCredits}`);

    for (const scheduledCourse of schedule.courses) {
        console.log(
            `${scheduledCourse.course.code} - ${scheduledCourse.course.name} | Section ${scheduledCourse.section.sectionId}`
        );

        for (const meeting of scheduledCourse.section.meetings) {
            console.log(`  ${meeting.day} ${meeting.startTime}-${meeting.endTime}`);
        }
    }

    console.log("");
});