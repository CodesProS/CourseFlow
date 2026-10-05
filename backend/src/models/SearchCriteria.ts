export type SearchCriteria = {
    major?: string; // e.g. "Computer Sciences BS"; boosts that department's courses
    interests?: string[];
    neededBreadth?: string[];
    neededGenEd?: string[];
    maxDifficulty?: number;
    preferredTags?: string[];
    targetCreditsMin?: number;
    targetCreditsMax?: number;
    // Courses the student definitely wants: every schedule must include them.
    lockedCourses?: string[];
    // Courses the student doesn't want suggested. Wins over a lock.
    excludedCourses?: string[];
};