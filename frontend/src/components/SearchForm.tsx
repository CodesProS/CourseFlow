import { useMemo, useState } from "react";
import Select from "react-select";
import type { MultiValue } from "react-select";
import type { SearchCriteria } from "../types";
import { useCourses, useCoursesMeta } from "../api/hooks";

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

// react-select styling — dark theme to match the app shell.
const selectStyles = {
    control: (base: Record<string, unknown>) => ({
        ...base,
        background: "var(--surface-2, #1a1d24)",
        borderColor: "var(--border, #2a2f3a)",
        minHeight: 38,
    }),
    menu: (base: Record<string, unknown>) => ({
        ...base,
        background: "var(--surface-2, #1a1d24)",
        zIndex: 20,
    }),
    option: (base: Record<string, unknown>, state: { isFocused: boolean }) => ({
        ...base,
        background: state.isFocused ? "var(--surface-3, #242933)" : "transparent",
        color: "var(--text, #e6e6e6)",
    }),
    multiValue: (base: Record<string, unknown>) => ({
        ...base,
        background: "var(--accent-muted, #2d3748)",
    }),
    multiValueLabel: (base: Record<string, unknown>) => ({
        ...base,
        color: "var(--text, #e6e6e6)",
    }),
    input: (base: Record<string, unknown>) => ({ ...base, color: "var(--text, #e6e6e6)" }),
    singleValue: (base: Record<string, unknown>) => ({ ...base, color: "var(--text, #e6e6e6)" }),
    placeholder: (base: Record<string, unknown>) => ({ ...base, color: "var(--text-muted, #7a8290)" }),
};

export default function SearchForm({ onGenerate, isSubmitting = false }: SearchFormProps) {
    const metaQuery = useCoursesMeta();
    const coursesQuery = useCourses();

    const [completedCourses, setCompletedCourses] = useState<Option[]>([]);
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
                label: `${c.code} — ${c.name}`,
            })),
        [coursesQuery.data],
    );

    const tagOptions = useMemo(() => toOptions(metaQuery.data?.tags ?? []), [metaQuery.data]);
    const breadthOptions = useMemo(() => toOptions(metaQuery.data?.breadths ?? []), [metaQuery.data]);
    const genEdOptions = useMemo(() => toOptions(metaQuery.data?.genEds ?? []), [metaQuery.data]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const criteria: SearchCriteria = {
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
            <h2>Planner Preferences</h2>

            {metaError && (
                <p className="error-text">
                    Couldn&apos;t reach the API: {metaError.message}. Is the backend running on :3001?
                </p>
            )}

            <label className="field">
                <span>Completed Courses</span>
                <Select
                    isMulti
                    options={courseOptions}
                    value={completedCourses}
                    onChange={(v) => setCompletedCourses([...v])}
                    placeholder={metaLoading ? "Loading courses…" : "Search e.g. MATH221"}
                    isLoading={coursesQuery.isLoading}
                    styles={selectStyles}
                    classNamePrefix="rs"
                />
            </label>

            <label className="field">
                <span>Interests (free text)</span>
                <input
                    type="text"
                    placeholder="AI, systems, databases"
                    value={interestsInput}
                    onChange={(e) => setInterestsInput(e.target.value)}
                />
            </label>

            <label className="field">
                <span>Preferred Tags</span>
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
                <span>Needed Breadth</span>
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
                <span>Needed GenEd</span>
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

            <div className="form-row">
                <label className="field">
                    <span>Max Difficulty</span>
                    <input
                        type="number"
                        min="1"
                        max="5"
                        value={maxDifficulty}
                        onChange={(e) =>
                            setMaxDifficulty(e.target.value === "" ? "" : Number(e.target.value))
                        }
                    />
                </label>

                <label className="field">
                    <span>Min Credits</span>
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
                    <span>Max Credits</span>
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

            <button type="submit" className="primary-btn" disabled={isSubmitting}>
                {isSubmitting ? "Generating…" : "Generate Schedules"}
            </button>
        </form>
    );
}
