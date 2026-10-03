import type { Schedule } from "../types";
import {
    DAYS,
    flattenScheduleMeetings,
    formatHourLabel,
    formatTimeRange,
    getCourseColors,
    getHourRange,
    getMeetingBlockStyle,
    HOUR_HEIGHT,
    normalizeDay,
} from "../utils/timetable";

type ScheduleGridProps = {
    schedule: Schedule;
};

export default function ScheduleGrid({ schedule }: ScheduleGridProps) {
    const meetings = flattenScheduleMeetings(schedule.courses);
    const colors = getCourseColors(schedule.courses);
    const { start, end } = getHourRange(meetings.map((m) => m.meeting));
    const hours = Array.from({ length: end - start }, (_, i) => start + i);

    return (
        <div className="panel timetable-panel">
            <div className="timetable">
                <div className="timetable-head">
                    <div />
                    {DAYS.map((day) => (
                        <div key={day} className="timetable-day">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="timetable-body">
                    <div className="timetable-times">
                        {hours.map((hour) => (
                            <div key={hour} className="timetable-time" style={{ height: HOUR_HEIGHT }}>
                                {formatHourLabel(hour)}
                            </div>
                        ))}
                    </div>

                    {DAYS.map((day) => (
                        <div
                            key={day}
                            className="timetable-column"
                            style={{ height: hours.length * HOUR_HEIGHT }}
                        >
                            {meetings
                                .filter(({ meeting }) => normalizeDay(meeting.day) === day)
                                .map(({ meeting, scheduledCourse }, index) => (
                                    <div
                                        key={`${scheduledCourse.course.code}-${index}`}
                                        className={`meeting-block ${colors.get(scheduledCourse.course.code)}`}
                                        style={getMeetingBlockStyle(meeting, start)}
                                        title={`${scheduledCourse.course.code} · ${formatTimeRange(meeting)}`}
                                    >
                                        <span className="meeting-code">{scheduledCourse.course.code}</span>
                                        <span className="meeting-time">{formatTimeRange(meeting)}</span>
                                    </div>
                                ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
