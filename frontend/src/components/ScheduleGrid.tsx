import type { Schedule, ScheduledCourse } from "../types";
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
    onSelectCourse: (course: ScheduledCourse) => void;
    // Off when the course list is shown above and already marks them.
    showUntimed?: boolean;
};

export default function ScheduleGrid({ schedule, onSelectCourse, showUntimed = true }: ScheduleGridProps) {
    const meetings = flattenScheduleMeetings(schedule.courses);
    const colors = getCourseColors(schedule.courses);
    const { start, end } = getHourRange(meetings.map((m) => m.meeting));
    const hours = Array.from({ length: end - start }, (_, i) => start + i);
    const untimed = schedule.courses.filter((c) => !c.section);

    const untimedStrip = showUntimed && untimed.length > 0 && (
        <div className={meetings.length > 0 ? "untimed-strip" : "untimed-strip only"}>
            <span className="untimed-strip-label">
                {meetings.length > 0
                    ? "Not on the calendar · no listed times"
                    : "None of these courses have listed meeting times, so there's nothing to place on the calendar."}
            </span>
            <div className="untimed-chips">
                {untimed.map((scheduledCourse) => (
                    <button
                        type="button"
                        key={scheduledCourse.course.code}
                        className={`untimed-chip ${colors.get(scheduledCourse.course.code)}`}
                        onClick={() => onSelectCourse(scheduledCourse)}
                    >
                        {scheduledCourse.course.code}
                    </button>
                ))}
            </div>
        </div>
    );

    if (meetings.length === 0) {
        return untimedStrip ? <div className="panel">{untimedStrip}</div> : null;
    }

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
                                    <button
                                        type="button"
                                        key={`${scheduledCourse.course.code}-${index}`}
                                        className={`meeting-block ${colors.get(scheduledCourse.course.code)}`}
                                        style={getMeetingBlockStyle(meeting, start)}
                                        title={`${scheduledCourse.course.code} · ${formatTimeRange(meeting)} — view details`}
                                        onClick={() => onSelectCourse(scheduledCourse)}
                                    >
                                        <span className="meeting-code">{scheduledCourse.course.code}</span>
                                        <span className="meeting-time">{formatTimeRange(meeting)}</span>
                                    </button>
                                ))}
                        </div>
                    ))}
                </div>
            </div>

            {untimedStrip}
        </div>
    );
}
