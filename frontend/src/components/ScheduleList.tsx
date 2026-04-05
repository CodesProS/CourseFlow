import type { Schedule } from "@backend/models/Schedule";
import ScheduleCard from "./ScheduleCard";

type ScheduleListProps = {
    schedule: Schedule | null;
};

export default function ScheduleList({ schedule }: ScheduleListProps) {
    if (!schedule) {
        return (
            <div className="panel">
                <h3>Schedule Courses</h3>
                <p>No schedule selected yet.</p>
            </div>
        );
    }

    return (
        <div className="panel">
            <div className="schedule-summary">
                <h3>Schedule Courses</h3>
                <div>Total Credits: {schedule.totalCredits}</div>
            </div>

            <div className="schedule-list">
                {schedule.courses.map((scheduledCourse) => (
                    <ScheduleCard
                        key={`${scheduledCourse.course.code}-${scheduledCourse.section.sectionId}`}
                        scheduledCourse={scheduledCourse}
                    />
                ))}
            </div>
        </div>
    );
}