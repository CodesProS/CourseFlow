import type { Schedule } from "../types";

type ScheduleListProps = {
    schedule: Schedule | null;
};

export default function ScheduleList({ schedule }: ScheduleListProps) {
    if (!schedule) {
        return (
            <div className="panel selected-courses-panel">
                <h3>Selected Courses</h3>
                <p>No schedule selected yet.</p>
            </div>
        );
    }

    return (
        <div className="panel selected-courses-panel">
            <div className="schedule-summary">
                <h3>Selected Courses</h3>
                <div>Total Credits: {schedule.totalCredits}</div>
            </div>

            <div className="selected-course-list">
                {schedule.courses.map((scheduledCourse) => (
                    <div
                        key={`${scheduledCourse.course.code}-${scheduledCourse.section.sectionId}`}
                        className="selected-course-item"
                    >
                        <span className="selected-course-code">{scheduledCourse.course.code}</span>
                        <span className="selected-course-name">{scheduledCourse.course.name}</span>
                        <span className="selected-course-section">
                            Sec {scheduledCourse.section.sectionId}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}