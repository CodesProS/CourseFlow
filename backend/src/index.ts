// CLI demo: runs the planning pipeline once and prints the results.
//   npm run dev:cli
import { courses } from "./data/courses";
import { SearchCriteria } from "./models/SearchCriteria";
import { selectCandidates } from "./services/coursePlanner";
import { scoreCourse } from "./services/scoringService";
import { generateSchedules } from "./services/scheduleService";

const completedCourses = new Set<string>(["COMPSCI200", "COMPSCI300", "MATH221"]);

const criteria: SearchCriteria = {
    neededBreadth: ["Humanities"],
    neededGenEd: ["Ethnic Studies"],
    interests: ["AI", "Systems"],
    maxDifficulty: 3,
    targetCreditsMin: 12,
    targetCreditsMax: 15,
};

const candidates = selectCandidates(courses, completedCourses, criteria);

console.log(`Top ${candidates.length} candidate courses:`);
for (const course of candidates) {
    const time = course.sections.length > 0 ? "" : " (time not listed)";
    console.log(`${course.code} - ${course.name} | score: ${scoreCourse(course, criteria)}${time}`);
}

const schedules = generateSchedules(candidates, criteria, 5);

console.log(`\nTop ${schedules.length} schedules:\n`);

schedules.forEach((schedule, index) => {
    console.log(`================ Schedule ${index + 1} ================`);
    console.log(`Total Credits: ${schedule.totalCredits} | Score: ${schedule.score}`);

    for (const { course, section } of schedule.courses) {
        if (!section) {
            console.log(`${course.code} - ${course.name} | time not listed`);
            continue;
        }
        console.log(`${course.code} - ${course.name} | Section ${section.sectionId}`);
        for (const meeting of section.meetings) {
            console.log(`  ${meeting.day} ${meeting.startTime}-${meeting.endTime}`);
        }
    }

    console.log("");
});
