import { useState } from "react";
import type { SearchCriteria } from "@backend/models/SearchCriteria";

type SearchFormProps = {
    onGenerate: (payload: { completedCourses: string[]; criteria: SearchCriteria }) => void;
};

function splitCommaSeparated(value: string): string[] {
    return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

export default function SearchForm({ onGenerate }: SearchFormProps) {
    const [completedCoursesInput, setCompletedCoursesInput] = useState("");
    const [interestsInput, setInterestsInput] = useState("");
    const [preferredTagsInput, setPreferredTagsInput] = useState("");
    const [neededBreadthInput, setNeededBreadthInput] = useState("");
    const [neededGenEdInput, setNeededGenEdInput] = useState("");
    const [maxDifficulty, setMaxDifficulty] = useState<number | "">(3);
    const [targetMinCredits, setTargetMinCredits] = useState<number | "">(12);
    const [targetMaxCredits, setTargetMaxCredits] = useState<number | "">(18);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const completedCourses = splitCommaSeparated(completedCoursesInput);

        const criteria: SearchCriteria = {
            interests: splitCommaSeparated(interestsInput),
            preferredTags: splitCommaSeparated(preferredTagsInput),
            neededBreadth: splitCommaSeparated(neededBreadthInput),
            neededGenEd: splitCommaSeparated(neededGenEdInput),
            maxDifficulty: maxDifficulty === "" ? undefined : Number(maxDifficulty),
            targetCreditsMin: targetMinCredits === "" ? undefined : Number(targetMinCredits),
            targetCreditsMax: targetMaxCredits === "" ? undefined : Number(targetMaxCredits),
        };

        onGenerate({ completedCourses, criteria });
    };

    return (
        <form className="search-form panel" onSubmit={handleSubmit}>
            <h2>Planner Preferences</h2>

            <label className="field">
                <span>Completed Courses</span>
                <textarea
                    placeholder="CS200, MATH221"
                    value={completedCoursesInput}
                    onChange={(e) => setCompletedCoursesInput(e.target.value)}
                    rows={3}
                />
            </label>

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
                <span>Preferred Tags</span>
                <input
                    type="text"
                    placeholder="project, programming, theory"
                    value={preferredTagsInput}
                    onChange={(e) => setPreferredTagsInput(e.target.value)}
                />
            </label>

            <label className="field">
                <span>Needed Breadth</span>
                <input
                    type="text"
                    placeholder="Biological Science, Humanities"
                    value={neededBreadthInput}
                    onChange={(e) => setNeededBreadthInput(e.target.value)}
                />
            </label>

            <label className="field">
                <span>Needed GenEd</span>
                <input
                    type="text"
                    placeholder="Ethnic Studies, Quantitative Reasoning A"
                    value={neededGenEdInput}
                    onChange={(e) => setNeededGenEdInput(e.target.value)}
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

            <button type="submit" className="primary-btn">
                Generate Schedules
            </button>
        </form>
    );
}