import type { ScheduledCourse } from "@backend/models/Schedule";

type ScheduleCardProps = {
    scheduledCourse: ScheduledCourse;
};

export default function ScheduleCard({ scheduledCourse }: ScheduleCardProps) {
    const { course, section } = scheduledCourse;

    return (
        <div className="schedule-card">
            <div className="schedule-card-header">
                <strong>{course.code}</strong>
                <span>{section.sectionId}</span>
            </div>

            <div className="schedule-card-name">{course.name}</div>

            <div className="schedule-card-meta">
                <span>{course.credits} credits</span>
                <span>Difficulty: {course.difficulty}</span>
                <span>{section.type}</span>
            </div>

            <ul className="meeting-list">
                {section.meetings.map((meeting, index) => (
                    <li key={`${section.sectionId}-${index}`}>
                        {meeting.day} {meeting.startTime}–{meeting.endTime}
                    </li>
                ))}
            </ul>
        </div>
    );
}