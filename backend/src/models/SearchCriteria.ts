export type SearchCriteria = {
    major?: string; // e.g. "Computer Sciences BS"; boosts that department's courses
    interests?: string[];
    neededBreadth?: string[];
    neededGenEd?: string[];
    maxDifficulty?: number;
    preferredTags?: string[];
    targetCreditsMin?: number;
    targetCreditsMax?: number;
};