import { MeetingTime, Section } from "../models/Course";
import { ScheduledCourse } from "../models/Schedule";

function timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
}

export function meetingsOverlap(a: MeetingTime, b: MeetingTime): boolean {
    if (a.day !== b.day) {
        return false;
    }

    const aStart = timeToMinutes(a.startTime);
    const aEnd = timeToMinutes(a.endTime);
    const bStart = timeToMinutes(b.startTime);
    const bEnd = timeToMinutes(b.endTime);

    return aStart < bEnd && bStart < aEnd;
}

export function sectionsConflict(sectionA: Section, sectionB: Section): boolean {
    for (const meetingA of sectionA.meetings) {
        for (const meetingB of sectionB.meetings) {
            if (meetingsOverlap(meetingA, meetingB)) {
                return true;
            }
        }
    }

    return false;
}

export function canAddSection(
    currentScheduledCourses: ScheduledCourse[],
    newSection: Section
): boolean {
    for (const scheduledCourse of currentScheduledCourses) {
        if (sectionsConflict(scheduledCourse.section, newSection)) {
            return false;
        }
    }

    return true;
}
