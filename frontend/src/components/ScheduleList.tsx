import type { Schedule } from "../types";
import { formatCourseName } from "../utils/format";
import { formatMeetings, getCourseColors } from "../utils/timetable";

type ScheduleListProps = {
    schedule: Schedule;
};

export default function ScheduleList({ schedule }: ScheduleListProps) {
    const colors = getCourseColors(schedule.courses);
    return (
        <div className="panel">
            <h3 className="panel-title">Courses</h3>
            <ul className="course-list">
                {schedule.courses.map(({ course, section }) => (
                    <li key={`${course.code}-${section.sectionId}`} className={colors.get(course.code)}>
                        <span className="course-dot" aria-hidden="true" />
                        <div className="course-main">
                            <div className="course-line">
                                <strong>{course.code}</strong>
                                <span className="course-name">{formatCourseName(course.name)}</span>
                            </div>
                            <div className="course-sub">
                                {section.type} {section.sectionId} · {formatMeetings(section.meetings)}
                            </div>
                        </div>
                        <span className="course-credits">{course.credits} cr</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
