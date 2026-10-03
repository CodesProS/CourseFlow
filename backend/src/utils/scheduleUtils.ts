import { Course, MeetingTime, Section } from "../models/Course";
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

// A null section (no listed meeting times) never conflicts.
export function canAddSection(
    currentScheduledCourses: ScheduledCourse[],
    newSection: Section | null
): boolean {
    if (!newSection) return true;
    for (const scheduledCourse of currentScheduledCourses) {
        if (scheduledCourse.section && sectionsConflict(scheduledCourse.section, newSection)) {
            return false;
        }
    }

    return true;
}

/**
 * Encodes every section's meeting times as a bitmask so a conflict check
 * is one AND instead of a pairwise meeting loop.
 *
 * Bits are "elementary intervals": per day, the gaps between consecutive
 * start/end times that appear anywhere in `courses`. Two meetings overlap
 * iff they share at least one elementary interval, so this is exact and
 * uses far fewer bits than fixed 5-minute slots.
 */
export function buildSectionMasks(courses: Course[]): Map<Section, bigint> {
    const boundariesByDay = new Map<string, Set<number>>();
    for (const course of courses) {
        for (const section of course.sections) {
            for (const m of section.meetings) {
                let set = boundariesByDay.get(m.day);
                if (!set) boundariesByDay.set(m.day, (set = new Set()));
                set.add(timeToMinutes(m.startTime));
                set.add(timeToMinutes(m.endTime));
            }
        }
    }

    // Assign a global bit index to each [boundary[k], boundary[k+1]) per day.
    const intervalsByDay = new Map<string, { start: number; end: number; bit: number }[]>();
    let nextBit = 0;
    for (const [day, set] of boundariesByDay) {
        const points = [...set].sort((a, b) => a - b);
        const intervals = [];
        for (let k = 0; k + 1 < points.length; k++) {
            intervals.push({ start: points[k], end: points[k + 1], bit: nextBit++ });
        }
        intervalsByDay.set(day, intervals);
    }

    const masks = new Map<Section, bigint>();
    for (const course of courses) {
        for (const section of course.sections) {
            let mask = 0n;
            for (const m of section.meetings) {
                const start = timeToMinutes(m.startTime);
                const end = timeToMinutes(m.endTime);
                for (const iv of intervalsByDay.get(m.day) ?? []) {
                    if (iv.start >= start && iv.end <= end) {
                        mask |= 1n << BigInt(iv.bit);
                    }
                }
            }
            masks.set(section, mask);
        }
    }
    return masks;
}
