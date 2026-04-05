type ScheduleNavigatorProps = {
    currentIndex: number;
    total: number;
    onPrevious: () => void;
    onNext: () => void;
};

export default function ScheduleNavigator({
    currentIndex,
    total,
    onPrevious,
    onNext,
}: ScheduleNavigatorProps) {
    if (total === 0) return null;

    return (
        <div className="schedule-nav">
            <button onClick={onPrevious} disabled={currentIndex === 0}>
                Previous
            </button>

            <div className="schedule-nav-label">
                Schedule {currentIndex + 1} of {total}
            </div>

            <button onClick={onNext} disabled={currentIndex === total - 1}>
                Next
            </button>
        </div>
    );
}