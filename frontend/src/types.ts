// Shapes the API returns. Kept in sync with backend/src/models by hand.
// Swap this for generated types (or Zod) when the surface area grows.

export type MeetingTime = {
    day: string;
    startTime: string;
    endTime: string;
};

export type Section = {
    sectionId: string;
    type: string;
    meetings: MeetingTime[];
};

export type Course = {
    code: string;
    name: string;
    credits: number;
    difficulty: number;
    tags: string[];
    breadth?: string;
    genEd?: string[];
    creditType?: string;
    prerequisites: string[];
    sections: Section[];
    // Added by the ingest step. Optional because not every course has grade history.
    avgGpa?: number;
};

export type ScheduledCourse = {
    course: Course;
    section: Section;
};

export type Schedule = {
    courses: ScheduledCourse[];
    totalCredits: number;
};

export type SearchCriteria = {
    interests?: string[];
    neededBreadth?: string[];
    neededGenEd?: string[];
    maxDifficulty?: number;
    preferredTags?: string[];
    targetCreditsMin?: number;
    targetCreditsMax?: number;
};

// Response shape of POST /plan
export type PlanResponse = {
    totalFound: number;
    schedules: Schedule[];
};

// Response shape of GET /courses/meta
export type CoursesMeta = {
    breadths: string[];
    genEds: string[];
    tags: string[];
};
