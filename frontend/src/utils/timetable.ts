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

export const HOUR_HEIGHT = 48; // pixels per hour

// Show at least 8 AM–6 PM, stretched to fit any earlier or later meetings.
const MIN_START_HOUR = 8;
const MIN_END_HOUR = 18;

export function parseTimeToMinutes(time: string): number {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
}

export function formatHourLabel(hour: number): string {
    const suffix = hour >= 12 ? "PM" : "AM";
    const normalized = hour % 12 === 0 ? 12 : hour % 12;
    return `${normalized} ${suffix}`;
}

export function getHourRange(meetings: MeetingTime[]): { start: number; end: number } {
    let start = MIN_START_HOUR;
    let end = MIN_END_HOUR;
    for (const m of meetings) {
        start = Math.min(start, Math.floor(parseTimeToMinutes(m.startTime) / 60));
        end = Math.max(end, Math.ceil(parseTimeToMinutes(m.endTime) / 60));
    }
    return { start, end };
}

// "11:00" -> "11:00", "13:20" -> "1:20"
function formatClock(time: string): string {
    const [h, m] = time.split(":").map(Number);
    return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")}`;
}

export function formatTimeRange(meeting: MeetingTime): string {
    return `${formatClock(meeting.startTime)}–${formatClock(meeting.endTime)}`;
}

// Groups days that share a time: "Mon Wed 11:00–12:30 · Fri 9:55–10:45".
export function formatMeetings(meetings: MeetingTime[]): string {
    const byTime = new Map<string, string[]>();
    const sorted = [...meetings].sort(
        (a, b) => DAYS.indexOf(normalizeDay(a.day)) - DAYS.indexOf(normalizeDay(b.day)),
    );
    for (const m of sorted) {
        const key = formatTimeRange(m);
        byTime.set(key, [...(byTime.get(key) ?? []), normalizeDay(m.day)]);
    }
    return [...byTime].map(([time, days]) => `${days.join(" ")} ${time}`).join(" · ");
}

export function normalizeDay(day: string): string {
    return DAY_LABEL_MAP[day] ?? day;
}

export function getMeetingBlockStyle(meeting: MeetingTime, startHour: number) {
    const startMinutes = parseTimeToMinutes(meeting.startTime);
    const endMinutes = parseTimeToMinutes(meeting.endTime);

    const gridStartMinutes = startHour * 60;
    const top = ((startMinutes - gridStartMinutes) / 60) * HOUR_HEIGHT;
    const height = ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT;

    return {
        top: `${top}px`,
        height: `${height}px`,
    };
}

const COURSE_COLORS = 8;

// Color by position in the schedule so every course in it gets a distinct
// color (a hash of the code can collide). Returns code -> CSS class.
export function getCourseColors(courses: ScheduledCourse[]): Map<string, string> {
    return new Map(
        courses.map(({ course }, i) => [course.code, `course-color-${(i % COURSE_COLORS) + 1}`]),
    );
}

// Courses without listed times have no meetings, so they're left out.
export function flattenScheduleMeetings(scheduledCourses: ScheduledCourse[]) {
    return scheduledCourses.flatMap((scheduledCourse) =>
        (scheduledCourse.section?.meetings ?? [])
            .map((meeting) => ({
                meeting,
                scheduledCourse,
            }))
            .filter(({ meeting }) => DAYS.includes(normalizeDay(meeting.day)))
    );
}