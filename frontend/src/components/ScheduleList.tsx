import type { Schedule, ScheduledCourse } from "../types";
import { formatCourseName, formatCredits } from "../utils/format";
import { formatMeetings, getCourseColors } from "../utils/timetable";

type ScheduleListProps = {
    schedule: Schedule;
    onSelectCourse: (course: ScheduledCourse) => void;
};

export default function ScheduleList({ schedule, onSelectCourse }: ScheduleListProps) {
    const colors = getCourseColors(schedule.courses);
    return (
        <div className="panel">
            <h3 className="panel-title">Courses</h3>
            <ul className="course-list">
                {schedule.courses.map((scheduled) => {
                    const { course, section } = scheduled;
                    return (
                        <li key={course.code} className={colors.get(course.code)}>
                            <button
                                type="button"
                                className="course-row"
                                onClick={() => onSelectCourse(scheduled)}
                            >
                                <span className="course-dot" aria-hidden="true" />
                                <span className="course-main">
                                    <span className="course-line">
                                        <strong>{course.code}</strong>
                                        <span className="course-name">{formatCourseName(course.name)}</span>
                                    </span>
                                    <span className="course-sub">
                                        {section ? (
                                            `${section.type} ${section.sectionId} · ${formatMeetings(section.meetings)}`
                                        ) : (
                                            <span className="untimed-label">Time not listed</span>
                                        )}
                                    </span>
                                </span>
                                <span className="course-credits">{formatCredits(course, true)}</span>
                                <span className="course-chevron" aria-hidden="true">›</span>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
