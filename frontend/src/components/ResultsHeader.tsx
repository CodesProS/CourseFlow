import type { Schedule } from "../types";

type ResultsHeaderProps = {
    schedule: Schedule;
    currentIndex: number;
    total: number;
    onPrevious: () => void;
    onNext: () => void;
};

export default function ResultsHeader({
    schedule,
    currentIndex,
    total,
    onPrevious,
    onNext,
}: ResultsHeaderProps) {
    const untimedCount = schedule.courses.filter((c) => !c.section).length;
    return (
        <div className="results-header">
            <div>
                <h2>
                    Schedule {currentIndex + 1}
                    <span className="results-total"> of {total}</span>
                </h2>
                <div className="results-meta">
                    <span>{schedule.courses.length} courses</span>
                    <span>{schedule.totalCredits} credits</span>
                    {schedule.score !== undefined && <span>Match score {schedule.score}</span>}
                    {untimedCount > 0 && <span>{untimedCount} without listed times</span>}
                </div>
            </div>
            <div className="results-nav">
                <button
                    type="button"
                    onClick={onPrevious}
                    disabled={currentIndex === 0}
                    aria-label="Previous schedule"
                >
                    ‹
                </button>
                <button
                    type="button"
                    onClick={onNext}
                    disabled={currentIndex === total - 1}
                    aria-label="Next schedule"
                >
                    ›
                </button>
            </div>
        </div>
    );
}
