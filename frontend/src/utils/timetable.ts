import type { MeetingTime, ScheduledCourse } from "../types";

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export const DAY_LABEL_MAP: Record<string, string> = {
    Monday: "Mon",
    Mon: "Mon",
    Tuesday: "Tue",
    Tue: "Tue",
    Wednesday: "Wed",
    Wed: "Wed",
    Thursday: "Thu",
    Thu: "Thu",
    Friday: "Fri",
    Fri: "Fri",
};

export const GRID_START_HOUR = 8;
export const GRID_END_HOUR = 20; // 8 PM
export const HOUR_HEIGHT = 52; // pixels per hour

export function parseTimeToMinutes(time: string): number {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
}

export function formatHourLabel(hour: number): string {
    const suffix = hour >= 12 ? "PM" : "AM";
    const normalized = hour % 12 === 0 ? 12 : hour % 12;
    return `${normalized}:00 ${suffix}`;
}

export function getTimeLabels(): string[] {
    const labels: string[] = [];
    for (let hour = GRID_START_HOUR; hour <= GRID_END_HOUR; hour++) {
        labels.push(formatHourLabel(hour));
    }
    return labels;
}

export function normalizeDay(day: string): string {
    return DAY_LABEL_MAP[day] ?? day;
}

export function getMeetingBlockStyle(meeting: MeetingTime) {
    const startMinutes = parseTimeToMinutes(meeting.startTime);
    const endMinutes = parseTimeToMinutes(meeting.endTime);

    const gridStartMinutes = GRID_START_HOUR * 60;
    const top = ((startMinutes - gridStartMinutes) / 60) * HOUR_HEIGHT;
    const height = ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT;

    return {
        top: `${top}px`,
        height: `${height}px`,
    };
}

export function getCourseColor(courseCode: string): string {
    const palette = [
        "course-color-1",
        "course-color-2",
        "course-color-3",
        "course-color-4",
        "course-color-5",
        "course-color-6",
    ];

    let hash = 0;
    for (let i = 0; i < courseCode.length; i++) {
        hash += courseCode.charCodeAt(i);
    }

    return palette[hash % palette.length];
}

export function flattenScheduleMeetings(scheduledCourses: ScheduledCourse[]) {
    return scheduledCourses.flatMap((scheduledCourse) =>
        scheduledCourse.section.meetings
            .map((meeting) => ({
                meeting,
                scheduledCourse,
            }))
            .filter(({ meeting }) => DAYS.includes(normalizeDay(meeting.day)))
    );
}