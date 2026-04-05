import type { Schedule } from "@backend/models/Schedule";
import {
    DAYS,
    flattenScheduleMeetings,
    getCourseColor,
    getMeetingBlockStyle,
    getTimeLabels,
    HOUR_HEIGHT,
    normalizeDay,
} from "../utils/timetable";

type ScheduleGridProps = {
    schedule: Schedule | null;
};

export default function ScheduleGrid({ schedule }: ScheduleGridProps) {
    const timeLabels = getTimeLabels();

    if (!schedule) {
        return (
            <div className="panel">
                <h3>Weekly Timetable</h3>
                <p>No schedule selected yet.</p>
            </div>
        );
    }

    const flattenedMeetings = flattenScheduleMeetings(schedule.courses);

    return (
        <div className="panel">
            <h3>Weekly Timetable</h3>

            <div className="timetable-wrapper">
                <div className="timetable-header">
                    <div className="time-column-header" />
                    {DAYS.map((day) => (
                        <div key={day} className="day-header">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="timetable-body">
                    <div className="time-column">
                        {timeLabels.map((label) => (
                            <div key={label} className="time-label" style={{ height: `${HOUR_HEIGHT}px` }}>
                                {label}
                            </div>
                        ))}
                    </div>

                    {DAYS.map((day) => (
                        <div key={day} className="day-column">
                            {timeLabels.map((_, index) => (
                                <div
                                    key={`${day}-${index}`}
                                    className="hour-slot"
                                    style={{ height: `${HOUR_HEIGHT}px` }}
                                />
                            ))}

                            {flattenedMeetings
                                .filter(({ meeting }) => normalizeDay(meeting.day) === day)
                                .map(({ meeting, scheduledCourse }, index) => {
                                    const style = getMeetingBlockStyle(meeting);
                                    const colorClass = getCourseColor(scheduledCourse.course.code);

                                    return (
                                        <div
                                            key={`${scheduledCourse.course.code}-${scheduledCourse.section.sectionId}-${index}`}
                                            className={`meeting-block ${colorClass}`}
                                            style={style}
                                        >
                                            <div className="meeting-course-code">{scheduledCourse.course.code}</div>
                                            <div className="meeting-course-name">{scheduledCourse.course.name}</div>
                                            <div className="meeting-section">
                                                {scheduledCourse.section.sectionId} • {meeting.startTime}–{meeting.endTime}
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}