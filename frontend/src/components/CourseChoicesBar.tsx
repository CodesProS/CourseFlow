import ExcludeIcon from "./ExcludeIcon";
import LockIcon from "./LockIcon";

type CourseChoicesBarProps = {
    lockedCourses: string[];
    excludedCourses: string[];
    onUnlock: (code: string) => void;
    onUnexclude: (code: string) => void;
};

// Courses the student locked in or excluded, shown above the results with a
// way to undo each.
export default function CourseChoicesBar({
    lockedCourses,
    excludedCourses,
    onUnlock,
    onUnexclude,
}: CourseChoicesBarProps) {
    return (
        <div className="choices-bar">
            {lockedCourses.length > 0 && (
                <ChoiceGroup
                    kind="locked"
                    label="Locked into every schedule"
                    icon={<LockIcon locked />}
                    codes={lockedCourses}
                    onRemove={onUnlock}
                    removeLabel="Unlock"
                />
            )}
            {excludedCourses.length > 0 && (
                <ChoiceGroup
                    kind="excluded"
                    label="Excluded"
                    icon={<ExcludeIcon />}
                    codes={excludedCourses}
                    onRemove={onUnexclude}
                    removeLabel="Stop excluding"
                />
            )}
        </div>
    );
}

type ChoiceGroupProps = {
    kind: "locked" | "excluded";
    label: string;
    icon: React.ReactNode;
    codes: string[];
    onRemove: (code: string) => void;
    removeLabel: string;
};

function ChoiceGroup({ kind, label, icon, codes, onRemove, removeLabel }: ChoiceGroupProps) {
    return (
        <div className={`choice-group ${kind}`}>
            <span className="choice-label">
                {icon}
                {label}
            </span>
            <div className="choice-chips">
                {codes.map((code) => (
                    <span key={code} className="choice-chip">
                        {code}
                        <button type="button" onClick={() => onRemove(code)} aria-label={`${removeLabel} ${code}`}>
                            ×
                        </button>
                    </span>
                ))}
            </div>
        </div>
    );
}
