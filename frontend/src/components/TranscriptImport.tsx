import { useRef, useState } from "react";
import {
    plannerCourses,
    type ParsedTranscript,
    type TranscriptCourse,
    type TranscriptSummary,
} from "../transcript/parseTranscript";

type TranscriptImportProps = {
    onApply: (courses: TranscriptCourse[]) => void;
};

type State =
    | { kind: "idle" }
    | { kind: "reading" }
    | { kind: "error"; message: string }
    | { kind: "review"; transcript: ParsedTranscript; selected: Set<string> }
    | { kind: "applied"; summary: TranscriptSummary; count: number };

const formatCredits = (n: number) =>
    n.toLocaleString(undefined, { maximumFractionDigits: 1 });

function SummaryStats({ summary }: { summary: TranscriptSummary }) {
    return (
        <dl className="transcript-stats">
            <div className="transcript-stat-wide">
                <dt>Credits earned</dt>
                <dd>{formatCredits(summary.earnedCredits)}</dd>
                <small>
                    {formatCredits(summary.uwCredits)} UW · {formatCredits(summary.transferCredits)} transfer
                </small>
            </div>
            <div>
                <dt>In progress</dt>
                <dd>{formatCredits(summary.inProgressCredits)}</dd>
            </div>
            <div>
                <dt>UW GPA</dt>
                <dd>{summary.gpa?.toFixed(3) ?? "—"}</dd>
            </div>
        </dl>
    );
}

export default function TranscriptImport({ onApply }: TranscriptImportProps) {
    const [state, setState] = useState<State>({ kind: "idle" });
    const fileInput = useRef<HTMLInputElement>(null);

    const handleFile = async (file: File | undefined) => {
        if (!file) return;
        setState({ kind: "reading" });
        try {
            // Lazy: pdf.js is ~1MB and most visitors never upload.
            const { readTranscript } = await import("../transcript/readTranscript");
            const transcript = await readTranscript(file);
            const usable = plannerCourses(transcript.courses);
            if (usable.length === 0) {
                setState({
                    kind: "error",
                    message: "Couldn't find any courses. Is this a UW-Madison transcript PDF?",
                });
                return;
            }
            setState({
                kind: "review",
                transcript,
                selected: new Set(usable.map((c) => c.code)),
            });
        } catch {
            setState({ kind: "error", message: "Couldn't read that file as a PDF." });
        } finally {
            if (fileInput.current) fileInput.current.value = "";
        }
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
    const openPicker = () => fileInput.current?.click();

    if (state.kind === "review") {
        const { transcript, selected } = state;
        const usable = plannerCourses(transcript.courses);
        const electiveCredits = transcript.courses
            .filter((c) => c.isElectiveCredit && c.status === "completed")
            .reduce((sum, c) => sum + c.earned, 0);

        const toggle = (code: string) => {
            const next = new Set(selected);
            if (next.has(code)) next.delete(code);
            else next.add(code);
            setState({ ...state, selected: next });
        };

        const apply = () => {
            onApply(usable.filter((c) => selected.has(c.code)));
            setState({ kind: "applied", summary: transcript.summary, count: selected.size });
        };

        return (
            <div className="transcript-import">
                {picker}
                <SummaryStats summary={transcript.summary} />
                <p className="transcript-hint">
                    Uncheck anything that looks wrong. In-progress courses count as taken for
                    prerequisites.
                </p>
                <ul className="transcript-courses">
                    {usable.map((c) => (
                        <li key={c.code}>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={selected.has(c.code)}
                                    onChange={() => toggle(c.code)}
                                />
                                <span className="transcript-course-code">{c.displayCode}</span>
                                <span className={`transcript-badge ${c.status}`}>
                                    {c.status === "in-progress"
                                        ? "In progress"
                                        : c.isTransfer
                                          ? "Transfer"
                                          : c.grade}
                                </span>
                                <span className="transcript-course-title">{c.title}</span>
                            </label>
                        </li>
                    ))}
                </ul>
                {electiveCredits > 0 && (
                    <p className="transcript-hint">
                        Plus {formatCredits(electiveCredits)} credits of transfer elective credit
                        (e.g. COMP SCI X12). These count toward totals but aren&apos;t specific
                        courses.
                    </p>
                )}
                <div className="transcript-actions">
                    <button type="button" className="secondary-btn" onClick={() => setState({ kind: "idle" })}>
                        Cancel
                    </button>
                    <button type="button" className="primary-btn" onClick={apply} disabled={selected.size === 0}>
                        Use {selected.size} courses
                    </button>
                </div>
            </div>
        );
    }

    if (state.kind === "applied") {
        return (
            <div className="transcript-import">
                {picker}
                <SummaryStats summary={state.summary} />
                <p className="transcript-hint">
                    Added {state.count} courses from your transcript.{" "}
                    <button type="button" className="link-btn" onClick={openPicker}>
                        Import another
                    </button>
                </p>
            </div>
        );
    }

    return (
        <div className="transcript-import">
            {picker}
            {state.kind === "error" && <p className="error-text">{state.message}</p>}
            <button
                type="button"
                className="secondary-btn"
                onClick={openPicker}
                disabled={state.kind === "reading"}
            >
                {state.kind === "reading" ? "Reading transcript…" : "Import from transcript (PDF)"}
            </button>
            <p className="transcript-hint">
                Read in your browser. Your transcript is never uploaded.
            </p>
        </div>
    );
}
