import { useEffect, useRef } from "react";
import type { PrereqNode, ScheduledCourse } from "../types";
import { formatCourseName, formatCredits } from "../utils/format";
import { formatMeetings } from "../utils/timetable";
import ExcludeIcon from "./ExcludeIcon";
import LockIcon from "./LockIcon";

type CourseDetailsProps = {
    // The course to show; null closes the dialog.
    scheduledCourse: ScheduledCourse | null;
    onClose: () => void;
    // Every code the student has credit for (cross-listings expanded).
    completedCourses: Set<string>;
    lockedCourses: Set<string>;
    onToggleLock: (code: string) => void;
    onExclude: (code: string) => void;
};

const LEVELS: Record<number, string> = {
    1: "Introductory",
    2: "Intermediate",
    3: "Advanced",
};

function isMet(node: PrereqNode, completed: Set<string>): boolean {
    if (typeof node === "boolean") return node;
    if (typeof node === "string") return completed.has(node);
    return node.op === "and"
        ? node.children.every((c) => isMet(c, completed))
        : node.children.some((c) => isMet(c, completed));
}

export default function CourseDetails({ scheduledCourse, onClose, ...rest }: CourseDetailsProps) {
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
            {scheduledCourse && <Details {...scheduledCourse} onClose={onClose} {...rest} />}
        </dialog>
    );
}

type DetailsProps = ScheduledCourse & Omit<CourseDetailsProps, "scheduledCourse">;

function Details({
    course,
    section,
    onClose,
    completedCourses,
    lockedCourses,
    onToggleLock,
    onExclude,
}: DetailsProps) {
    const locked = lockedCourses.has(course.code);

    return (
        <div className="course-details">
            <header className="course-details-header">
                <div>
                    <span className="course-details-code">{course.code}</span>
                    <h3>{formatCourseName(course.name)}</h3>
                </div>
                <div className="course-details-actions">
                    <button
                        type="button"
                        className={`lock-toggle${locked ? " locked" : ""}`}
                        onClick={() => onToggleLock(course.code)}
                        aria-pressed={locked}
                    >
                        <LockIcon locked={locked} />
                        {locked ? "Locked in" : "Lock in"}
                    </button>
                    <button
                        type="button"
                        className="lock-toggle exclude"
                        onClick={() => onExclude(course.code)}
                        title="Never suggest this course"
                    >
                        <ExcludeIcon />
                        Exclude
                    </button>
                    <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
                        ×
                    </button>
                </div>
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
                <PrereqStatus tree={course.prerequisiteTree} completed={completedCourses} />
                {course.prerequisiteTree !== undefined && typeof course.prerequisiteTree !== "boolean" && (
                    <PrereqTree node={course.prerequisiteTree} completed={completedCourses} />
                )}
                {course.prerequisiteText && (
                    <p className="prereq-source">As UW words it: {course.prerequisiteText}</p>
                )}
            </section>
        </div>
    );
}

function PrereqStatus({ tree, completed }: { tree: PrereqNode | undefined; completed: Set<string> }) {
    if (tree === undefined) {
        return <p className="prereq-status met">✓ No course prerequisites</p>;
    }
    if (tree === false) {
        return (
            <p className="prereq-status unknown">
                Needs instructor consent or a specific program, which CourseFlow can&apos;t check.
            </p>
        );
    }
    return isMet(tree, completed) ? (
        <p className="prereq-status met">✓ You meet the prerequisites</p>
    ) : (
        <p className="prereq-status missing">Missing prerequisites. Check the courses without a ✓.</p>
    );
}

// "All of" / "One of" groups with a ✓ on everything the student has.
function PrereqTree({ node, completed }: { node: PrereqNode; completed: Set<string> }) {
    if (typeof node === "boolean") return null; // folded out at ingest; not expected here

    if (typeof node === "string") {
        const met = completed.has(node);
        return (
            <span className={`prereq-course${met ? " met" : ""}`}>
                <span className="prereq-mark" aria-hidden="true">{met ? "✓" : "○"}</span>
                {node}
                <span className="visually-hidden">{met ? " (completed)" : " (not completed)"}</span>
            </span>
        );
    }

    const met = isMet(node, completed);
    return (
        <div className={`prereq-group${met ? " met" : ""}`}>
            <span className="prereq-group-label">
                <span className="prereq-mark" aria-hidden="true">{met ? "✓" : "○"}</span>
                {node.op === "and" ? "All of" : "One of"}
            </span>
            <div className="prereq-children">
                {node.children.map((child, i) => (
                    <PrereqTree key={i} node={child} completed={completed} />
                ))}
            </div>
        </div>
    );
}
