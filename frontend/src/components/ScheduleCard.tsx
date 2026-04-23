import type { ScheduledCourse } from "../types";

type ScheduleCardProps = {
    scheduledCourse: ScheduledCourse;
};

export default function ScheduleCard({ scheduledCourse }: ScheduleCardProps) {
    const { course, section } = scheduledCourse;

    return (
        <div className="schedule-card">
            <div className="schedule-card-header">
                <strong>{course.code}</strong>
                <span className="schedule-card-section">Section {section.sectionId}</span>
            </div>

            <div className="schedule-card-name">{course.name}</div>

            <div className="schedule-card-meta">
                <span>{course.credits} credits</span>
                <span>Difficulty: {course.difficulty}</span>
                <span>{section.type}</span>
            </div>

            <div className="schedule-card-times">
                {section.meetings.map((meeting, index) => (
                    <div key={`${section.sectionId}-${index}`} className="schedule-time-row">
                        {meeting.day} {meeting.startTime}–{meeting.endTime}
                    </div>
                ))}
            </div>
        </div>
    );
}