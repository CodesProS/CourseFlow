import { useEffect, useRef } from "react";
import type { ScheduledCourse } from "../types";
import { formatCourseName, formatCredits } from "../utils/format";
import { formatMeetings } from "../utils/timetable";

type CourseDetailsProps = {
    // The course to show; null closes the dialog.
    scheduledCourse: ScheduledCourse | null;
    onClose: () => void;
};

const LEVELS: Record<number, string> = {
    1: "Introductory",
    2: "Intermediate",
    3: "Advanced",
};

export default function CourseDetails({ scheduledCourse, onClose }: CourseDetailsProps) {
    const dialog = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        if (scheduledCourse && !dialog.current?.open) dialog.current?.showModal();
        if (!scheduledCourse && dialog.current?.open) dialog.current.close();
    }, [scheduledCourse]);

    return (
        <dialog
            ref={dialog}
            className="modal course-dialog"
            onClose={onClose}
            onClick={(e) => {
                // Click on the backdrop (the dialog element itself) closes it.
                if (e.target === e.currentTarget) onClose();
            }}
        >
            {scheduledCourse && <Details {...scheduledCourse} onClose={onClose} />}
        </dialog>
    );
}

function Details({ course, section, onClose }: ScheduledCourse & { onClose: () => void }) {
    return (
        <div className="course-details">
            <header className="course-details-header">
                <div>
                    <span className="course-details-code">{course.code}</span>
                    <h3>{formatCourseName(course.name)}</h3>
                </div>
                <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
                    ×
                </button>
            </header>

            <div className="course-details-tags">
                <span title={course.creditsEstimated ? "Credit count not in the catalog data; 3 assumed" : undefined}>
                    {formatCredits(course)}
                    {course.creditsEstimated && " (estimated)"}
                </span>
                {LEVELS[course.difficulty] && <span>{LEVELS[course.difficulty]}</span>}
                {course.genEd?.map((g) => (
                    <span key={g}>{g === "GenEd" ? "Gen-ed" : g}</span>
                ))}
            </div>

            <section>
                <h4>About this course</h4>
                <p className={course.description ? "" : "muted"}>
                    {course.description ?? "No description available for this course yet."}
                </p>
            </section>

            <section>
                <h4>In this schedule</h4>
                {section ? (
                    <p>
                        {section.type} {section.sectionId} · {formatMeetings(section.meetings)}
                    </p>
                ) : (
                    <p className="muted">
                        Meeting times aren&apos;t listed for this course, so it isn&apos;t on the calendar.
                        Check the UW Course Search before enrolling.
                    </p>
                )}
            </section>

            <section>
                <h4>Prerequisites</h4>
                {course.prerequisiteText ? (
                    <p>{course.prerequisiteText}</p>
                ) : course.prerequisites.length > 0 ? (
                    <ul className="course-details-prereqs">
                        {course.prerequisites.map((p) => (
                            <li key={p}>{p}</li>
                        ))}
                    </ul>
                ) : (
                    <p className="muted">None</p>
                )}
            </section>
        </div>
    );
}
