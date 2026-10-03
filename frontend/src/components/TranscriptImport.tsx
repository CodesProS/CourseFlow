import { useEffect, useRef, useState } from "react";
import {
    plannerCourses,
    type ParsedTranscript,
    type TranscriptCourse,
} from "../transcript/parseTranscript";

type TranscriptImportProps = {
    // Replaces whatever the previous import added; ([], null) removes it.
    onApply: (courses: TranscriptCourse[], major: string | null) => void;
};

type Imported = { transcript: ParsedTranscript; selected: Set<string> };

const formatCredits = (n: number) =>
    n.toLocaleString(undefined, { maximumFractionDigits: 1 });

function termLabel(term: string): string {
    return term.startsWith("Transfer: ")
        ? `Transfer credit · ${term.slice("Transfer: ".length)}`
        : term.replace(/-\d{4}$/, ""); // "Fall 2025-2026" -> "Fall 2025"
}

function groupByTerm(courses: TranscriptCourse[]): [string, TranscriptCourse[]][] {
    const groups = new Map<string, TranscriptCourse[]>();
    for (const c of courses) {
        const list = groups.get(c.term) ?? [];
        list.push(c);
        groups.set(c.term, list);
    }
    return [...groups];
}

function statusLabel(c: TranscriptCourse): string | null {
    if (c.status === "in-progress") return "In progress";
    if (c.isTransfer) return "Transfer";
    return null;
}

export default function TranscriptImport({ onApply }: TranscriptImportProps) {
    const [reading, setReading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dragging, setDragging] = useState(false);
    // `draft` is what the open dialog is editing; `applied` is what's in the form.
    const [draft, setDraft] = useState<Imported | null>(null);
    const [applied, setApplied] = useState<Imported | null>(null);

    const fileInput = useRef<HTMLInputElement>(null);
    const dialog = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        if (draft && !dialog.current?.open) dialog.current?.showModal();
        if (!draft && dialog.current?.open) dialog.current.close();
    }, [draft]);

    const handleFile = async (file: File | undefined) => {
        if (!file) return;
        setError(null);
        setReading(true);
        try {
            // Lazy: pdf.js is ~1MB and most visitors never upload.
            const { readTranscript } = await import("../transcript/readTranscript");
            const transcript = await readTranscript(file);
            const usable = plannerCourses(transcript.courses);
            if (usable.length === 0) {
                setError("Couldn't find any courses. Is this a UW-Madison transcript PDF?");
                return;
            }
            setDraft({ transcript, selected: new Set(usable.map((c) => c.code)) });
        } catch {
            setError("Couldn't read that file as a PDF.");
        } finally {
            setReading(false);
            if (fileInput.current) fileInput.current.value = "";
        }
    };

    const confirm = () => {
        if (!draft) return;
        const usable = plannerCourses(draft.transcript.courses);
        onApply(
            usable.filter((c) => draft.selected.has(c.code)),
            draft.transcript.major,
        );
        setApplied(draft);
        setDraft(null);
    };

    const remove = () => {
        onApply([], null);
        setApplied(null);
    };

    const picker = (
        <input
            ref={fileInput}
            type="file"
            accept="application/pdf"
            hidden
            onChange={(e) => handleFile(e.target.files?.[0])}
        />
    );

    return (
        <>
            {picker}

            {applied ? (
                <div className="transcript-applied">
                    <div className="transcript-applied-text">
                        <strong>
                            {applied.selected.size} courses from transcript
                        </strong>
                        <span>
                            {formatCredits(applied.transcript.summary.earnedCredits)} credits
                            {applied.transcript.summary.inProgressCredits > 0 &&
                                ` · ${formatCredits(applied.transcript.summary.inProgressCredits)} in progress`}
                        </span>
                    </div>
                    <div className="transcript-applied-actions">
                        <button type="button" className="link-btn" onClick={() => setDraft(applied)}>
                            Review
                        </button>
                        <button type="button" className="link-btn muted" onClick={remove}>
                            Remove
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    type="button"
                    className={`transcript-drop${dragging ? " dragging" : ""}`}
                    onClick={() => fileInput.current?.click()}
                    onDragOver={(e) => {
                        e.preventDefault();
                        setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setDragging(false);
                        handleFile(e.dataTransfer.files[0]);
                    }}
                    disabled={reading}
                >
                    <strong>{reading ? "Reading transcript…" : "Import from transcript"}</strong>
                    <span>Drop your UW-Madison PDF or click to browse</span>
                </button>
            )}

            {error && <p className="error-text transcript-error">{error}</p>}
            {!applied && (
                <p className="transcript-privacy">Read on your device. Never uploaded.</p>
            )}

            <dialog
                ref={dialog}
                className="transcript-dialog"
                onClose={() => setDraft(null)}
                onClick={(e) => {
                    // Click on the backdrop (the dialog element itself) closes it.
                    if (e.target === e.currentTarget) setDraft(null);
                }}
            >
                {draft && (
                    <ReviewPanel
                        draft={draft}
                        onChange={(selected) => setDraft({ ...draft, selected })}
                        onCancel={() => setDraft(null)}
                        onConfirm={confirm}
                    />
                )}
            </dialog>
        </>
    );
}

type ReviewPanelProps = {
    draft: Imported;
    onChange: (selected: Set<string>) => void;
    onCancel: () => void;
    onConfirm: () => void;
};

function ReviewPanel({ draft, onChange, onCancel, onConfirm }: ReviewPanelProps) {
    const { transcript, selected } = draft;
    const { summary } = transcript;
    const usable = plannerCourses(transcript.courses);
    const electiveCredits = transcript.courses
        .filter((c) => c.isElectiveCredit && c.status === "completed")
        .reduce((sum, c) => sum + c.earned, 0);

    const setMany = (codes: string[], on: boolean) => {
        const next = new Set(selected);
        for (const code of codes) {
            if (on) next.add(code);
            else next.delete(code);
        }
        onChange(next);
    };

    return (
        <div className="transcript-review">
            <header className="transcript-review-header">
                <div>
                    <h3>Review your transcript</h3>
                    {transcript.major && (
                        <p className="transcript-major">{transcript.major}</p>
                    )}
                    <p>
                        Uncheck anything that looks wrong. In-progress courses count as taken for
                        prerequisites.
                    </p>
                </div>
                <button type="button" className="icon-btn" onClick={onCancel} aria-label="Close">
                    ×
                </button>
            </header>

            <dl className="transcript-stats">
                <div>
                    <dt>Credits earned</dt>
                    <dd>{formatCredits(summary.earnedCredits)}</dd>
                    <small>
                        {formatCredits(summary.uwCredits)} UW · {formatCredits(summary.transferCredits)} transfer
                    </small>
                </div>
                <div>
                    <dt>In progress</dt>
                    <dd>{formatCredits(summary.inProgressCredits)}</dd>
                    <small>credits this term</small>
                </div>
                <div>
                    <dt>Courses found</dt>
                    <dd>{usable.length}</dd>
                    <small>{selected.size} selected</small>
                </div>
            </dl>

            <div className="transcript-terms">
                {groupByTerm(usable).map(([term, courses]) => {
                    const codes = courses.map((c) => c.code);
                    const allOn = codes.every((code) => selected.has(code));
                    return (
                        <section key={term} className="transcript-term">
                            <div className="transcript-term-header">
                                <h4>{termLabel(term)}</h4>
                                <button
                                    type="button"
                                    className="link-btn muted"
                                    onClick={() => setMany(codes, !allOn)}
                                >
                                    {allOn ? "Deselect all" : "Select all"}
                                </button>
                            </div>
                            <ul>
                                {courses.map((c) => (
                                    <li key={c.code}>
                                        <label className={selected.has(c.code) ? "" : "off"}>
                                            <input
                                                type="checkbox"
                                                checked={selected.has(c.code)}
                                                onChange={(e) => setMany([c.code], e.target.checked)}
                                            />
                                            <span className="transcript-course-code">{c.displayCode}</span>
                                            <span className="transcript-course-title">{c.title}</span>
                                            {statusLabel(c) && (
                                                <span className={`transcript-badge ${c.status}`}>
                                                    {statusLabel(c)}
                                                </span>
                                            )}
                                        </label>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    );
                })}
                {electiveCredits > 0 && (
                    <p className="transcript-note">
                        Also counted: {formatCredits(electiveCredits)} credits of general transfer
                        credit (e.g. COMP SCI X12). It isn&apos;t tied to a specific course, so it
                        can&apos;t satisfy prerequisites.
                    </p>
                )}
            </div>

            <footer className="transcript-review-footer">
                <button type="button" className="ghost-btn" onClick={onCancel}>
                    Cancel
                </button>
                <button
                    type="button"
                    className="primary-btn"
                    onClick={onConfirm}
                    disabled={selected.size === 0}
                >
                    Add {selected.size} courses
                </button>
            </footer>
        </div>
    );
}
