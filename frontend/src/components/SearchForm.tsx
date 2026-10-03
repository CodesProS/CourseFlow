import { useMemo, useState } from "react";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import type { MultiValue } from "react-select";
import type { SearchCriteria } from "../types";
import type { TranscriptCourse } from "../transcript/parseTranscript";
import { useCourses, useCoursesMeta } from "../api/hooks";
import { formatCourseName } from "../utils/format";
import TranscriptImport from "./TranscriptImport";

type SearchFormProps = {
    onGenerate: (payload: { completedCourses: string[]; criteria: SearchCriteria }) => void;
    isSubmitting?: boolean;
};

type Option = { value: string; label: string };

function splitCommaSeparated(value: string): string[] {
    return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

// react-select works in { value, label } pairs. These helpers convert to/from
// the string[] shape the API expects.
const toOptions = (values: string[]): Option[] =>
    values.map((v) => ({ value: v, label: v }));

const fromOptions = (opts: MultiValue<Option>): string[] =>
    opts.map((o) => o.value);

const MAX_COURSE_MATCHES = 50;

// Catalog codes have no spaces: "COMP SCI 300" -> "COMPSCI300".
const normalizeCode = (input: string) => input.toUpperCase().replace(/\s+/g, "");

// react-select styling — dark theme to match the app shell.
// react-select styling — uses the theme tokens from index.css.
const selectStyles = {
    control: (base: Record<string, unknown>, state: { isFocused: boolean }) => ({
        ...base,
        background: "var(--surface-2)",
        borderColor: state.isFocused ? "var(--accent)" : "var(--border)",
        borderRadius: 10,
        minHeight: 40,
        boxShadow: state.isFocused ? "0 0 0 3px var(--accent-muted)" : "none",
        "&:hover": { borderColor: state.isFocused ? "var(--accent)" : "var(--border-strong)" },
    }),
    menu: (base: Record<string, unknown>) => ({
        ...base,
        background: "var(--surface-2)",
        border: "1px solid var(--border-strong)",
        borderRadius: 10,
        overflow: "hidden",
        zIndex: 20,
    }),
    option: (base: Record<string, unknown>, state: { isFocused: boolean }) => ({
        ...base,
        background: state.isFocused ? "var(--surface-3)" : "transparent",
        color: "var(--text)",
        fontSize: "0.875rem",
    }),
    indicatorSeparator: () => ({ display: "none" }),
    dropdownIndicator: (base: Record<string, unknown>) => ({ ...base, color: "var(--text-faint)" }),
    clearIndicator: (base: Record<string, unknown>) => ({ ...base, color: "var(--text-faint)" }),
    noOptionsMessage: (base: Record<string, unknown>) => ({ ...base, color: "var(--text-faint)" }),
    valueContainer: (base: Record<string, unknown>) => ({
        ...base,
        maxHeight: 112,
        overflowY: "auto" as const,
    }),
    multiValue: (base: Record<string, unknown>) => ({
        ...base,
        background: "var(--accent-muted)",
        borderRadius: 6,
    }),
    multiValueLabel: (base: Record<string, unknown>) => ({
        ...base,
        color: "var(--accent-text)",
        fontSize: "0.75rem",
        fontWeight: 600,
    }),
    input: (base: Record<string, unknown>) => ({ ...base, color: "var(--text)" }),
    singleValue: (base: Record<string, unknown>) => ({ ...base, color: "var(--text)" }),
    placeholder: (base: Record<string, unknown>) => ({ ...base, color: "var(--text-faint)" }),
};

export default function SearchForm({ onGenerate, isSubmitting = false }: SearchFormProps) {
    const metaQuery = useCoursesMeta();
    const coursesQuery = useCourses();

    const [completedCourses, setCompletedCourses] = useState<Option[]>([]);
    // Codes the last transcript import added, so a re-import or "Remove"
    // replaces them without touching courses entered by hand.
    const [transcriptCodes, setTranscriptCodes] = useState<Set<string>>(new Set());
    const [major, setMajor] = useState("");
    // True while the major field still holds what the transcript filled in.
    const [majorFromTranscript, setMajorFromTranscript] = useState(false);
    const [interestsInput, setInterestsInput] = useState("");
    const [preferredTags, setPreferredTags] = useState<Option[]>([]);
    const [neededBreadth, setNeededBreadth] = useState<Option[]>([]);
    const [neededGenEd, setNeededGenEd] = useState<Option[]>([]);
    const [maxDifficulty, setMaxDifficulty] = useState<number | "">(3);
    const [targetMinCredits, setTargetMinCredits] = useState<number | "">(12);
    const [targetMaxCredits, setTargetMaxCredits] = useState<number | "">(18);

    const courseOptions: Option[] = useMemo(
        () =>
            (coursesQuery.data ?? []).map((c) => ({
                value: c.code,
                label: `${c.code} — ${formatCourseName(c.name)}`,
            })),
        [coursesQuery.data],
    );

    // Cross-listed courses get a label under each of their codes, so a
    // transcript's "ECE354" shows the COMPSCI354 title.
    const courseLabels = useMemo(() => {
        const labels = new Map<string, string>();
        for (const c of coursesQuery.data ?? []) {
            for (const code of [c.code, ...(c.aliases ?? [])]) {
                labels.set(code, `${code} — ${formatCourseName(c.name)}`);
            }
        }
        return labels;
    }, [coursesQuery.data]);

    // The catalog has thousands of courses; rendering them all in the menu
    // freezes it. Search after two characters and show the first matches.
    const [courseQuery, setCourseQuery] = useState("");
    const matchingCourseOptions = useMemo(() => {
        const query = normalizeCode(courseQuery);
        if (query.length < 2) return [];
        const words = courseQuery.toLowerCase().split(/\s+/).filter(Boolean);
        return courseOptions
            .filter(
                (o) =>
                    o.value.startsWith(query) ||
                    words.every((w) => o.label.toLowerCase().includes(w)),
            )
            .slice(0, MAX_COURSE_MATCHES);
    }, [courseOptions, courseQuery]);

    const handleTranscript = (courses: TranscriptCourse[], transcriptMajor: string | null) => {
        const imported = courses.map((c) => ({
            value: c.code,
            label: courseLabels.get(c.code) ?? `${c.displayCode} — ${c.title}`,
        }));
        setCompletedCourses((prev) => {
            const kept = prev.filter((o) => !transcriptCodes.has(o.value));
            const seen = new Set(kept.map((o) => o.value));
            return [...kept, ...imported.filter((o) => !seen.has(o.value))];
        });
        setTranscriptCodes(new Set(imported.map((o) => o.value)));

        if (transcriptMajor) {
            setMajor(transcriptMajor);
            setMajorFromTranscript(true);
        } else if (majorFromTranscript) {
            // Transcript removed: clear the major only if the user hadn't edited it.
            setMajor("");
            setMajorFromTranscript(false);
        }
    };

    const tagOptions = useMemo(() => toOptions(metaQuery.data?.tags ?? []), [metaQuery.data]);
    const breadthOptions = useMemo(() => toOptions(metaQuery.data?.breadths ?? []), [metaQuery.data]);
    const genEdOptions = useMemo(() => toOptions(metaQuery.data?.genEds ?? []), [metaQuery.data]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const criteria: SearchCriteria = {
            major: major.trim() || undefined,
            interests: splitCommaSeparated(interestsInput),
            preferredTags: fromOptions(preferredTags),
            neededBreadth: fromOptions(neededBreadth),
            neededGenEd: fromOptions(neededGenEd),
            maxDifficulty: maxDifficulty === "" ? undefined : Number(maxDifficulty),
            targetCreditsMin: targetMinCredits === "" ? undefined : Number(targetMinCredits),
            targetCreditsMax: targetMaxCredits === "" ? undefined : Number(targetMaxCredits),
        };

        onGenerate({ completedCourses: fromOptions(completedCourses), criteria });
    };

    const metaLoading = metaQuery.isLoading || coursesQuery.isLoading;
    const metaError = metaQuery.error ?? coursesQuery.error;

    return (
        <form className="search-form panel" onSubmit={handleSubmit}>
            {metaError && (
                <p className="error-text">
                    Couldn&apos;t reach the API: {metaError.message}. Is the backend running on :3001?
                </p>
            )}

            <h3 className="form-section">About you</h3>
            <div className="field">
                <TranscriptImport onApply={handleTranscript} />
            </div>

            <label className="field">
                <span>
                    Major
                    {majorFromTranscript && <em className="field-hint">from transcript</em>}
                </span>
                <input
                    type="text"
                    placeholder="e.g. Computer Sciences BS"
                    value={major}
                    onChange={(e) => {
                        setMajor(e.target.value);
                        setMajorFromTranscript(false);
                    }}
                />
            </label>

            <div className="field">
                <span>Completed courses</span>
                <CreatableSelect
                    isMulti
                    options={matchingCourseOptions}
                    // Already filtered above; react-select's own filter would
                    // re-scan every option on each keystroke.
                    filterOption={null}
                    inputValue={courseQuery}
                    onInputChange={(value, { action }) => {
                        if (action === "input-change") setCourseQuery(value);
                        if (action === "menu-close" || action === "set-value") setCourseQuery("");
                    }}
                    noOptionsMessage={() =>
                        courseQuery.trim().length < 2 ? "Type a course code or name" : "No matching courses"
                    }
                    value={completedCourses}
                    onChange={(v) => setCompletedCourses([...v])}
                    // Prereqs like MATH221 aren't in the catalog, so allow any code.
                    onCreateOption={(input) => {
                        const code = normalizeCode(input);
                        if (code && !completedCourses.some((o) => o.value === code)) {
                            setCompletedCourses([...completedCourses, { value: code, label: code }]);
                        }
                    }}
                    formatCreateLabel={(input) => `Add "${normalizeCode(input)}"`}
                    // Chips show just the code; the menu shows code and title.
                    formatOptionLabel={(o, { context }) => (context === "value" ? o.value : o.label)}
                    placeholder={metaLoading ? "Loading courses…" : "Search or type e.g. MATH221"}
                    isLoading={coursesQuery.isLoading}
                    styles={selectStyles}
                    classNamePrefix="rs"
                />
            </div>

            <h3 className="form-section">What you&apos;re looking for</h3>
            <label className="field">
                <span>Interests</span>
                <input
                    type="text"
                    placeholder="AI, systems, databases"
                    value={interestsInput}
                    onChange={(e) => setInterestsInput(e.target.value)}
                />
            </label>

            <label className="field">
                <span>Preferred tags</span>
                <Select
                    isMulti
                    options={tagOptions}
                    value={preferredTags}
                    onChange={(v) => setPreferredTags([...v])}
                    placeholder={metaLoading ? "Loading…" : "e.g. project, programming"}
                    isLoading={metaQuery.isLoading}
                    styles={selectStyles}
                    classNamePrefix="rs"
                />
            </label>

            <label className="field">
                <span>Breadth still needed</span>
                <Select
                    isMulti
                    options={breadthOptions}
                    value={neededBreadth}
                    onChange={(v) => setNeededBreadth([...v])}
                    placeholder={metaLoading ? "Loading…" : "e.g. Humanities"}
                    isLoading={metaQuery.isLoading}
                    styles={selectStyles}
                    classNamePrefix="rs"
                />
            </label>

            <label className="field">
                <span>Gen-ed still needed</span>
                <Select
                    isMulti
                    options={genEdOptions}
                    value={neededGenEd}
                    onChange={(v) => setNeededGenEd([...v])}
                    placeholder={metaLoading ? "Loading…" : "e.g. Ethnic Studies"}
                    isLoading={metaQuery.isLoading}
                    styles={selectStyles}
                    classNamePrefix="rs"
                />
            </label>

            <h3 className="form-section">Course load</h3>
            <div className="form-row">
                <label className="field">
                    <span>Max difficulty</span>
                    <input
                        type="number"
                        min="1"
                        max="3"
                        value={maxDifficulty}
                        onChange={(e) =>
                            setMaxDifficulty(e.target.value === "" ? "" : Number(e.target.value))
                        }
                    />
                </label>

                <label className="field">
                    <span>Min credits</span>
                    <input
                        type="number"
                        min="0"
                        value={targetMinCredits}
                        onChange={(e) =>
                            setTargetMinCredits(e.target.value === "" ? "" : Number(e.target.value))
                        }
                    />
                </label>

                <label className="field">
                    <span>Max credits</span>
                    <input
                        type="number"
                        min="0"
                        value={targetMaxCredits}
                        onChange={(e) =>
                            setTargetMaxCredits(e.target.value === "" ? "" : Number(e.target.value))
                        }
                    />
                </label>
            </div>

            <div className="form-footer">
                <button type="submit" className="primary-btn" disabled={isSubmitting}>
                    {isSubmitting ? "Generating…" : "Generate schedules"}
                </button>
            </div>
        </form>
    );
}
