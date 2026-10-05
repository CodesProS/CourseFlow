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
    aliases?: string[]; // other codes for a cross-listed course
    name: string;
    credits: number;
    difficulty: number;
    tags: string[];
    breadth?: string;
    genEd?: string[];
    creditType?: string;
    prerequisites: string[];
    prerequisiteTree?: PrereqNode; // absent: no course requirement
    prerequisiteText?: string; // the rule as UW words it
    sections: Section[]; // empty when meeting times aren't listed
    // Added by the ingest step. Optional because not every course has them.
    description?: string;
    avgGpa?: number;
    creditsEstimated?: boolean; // source had no credit count; 3 assumed
};

// A course code, a resolved non-course condition (true = assumed met,
// false = can't be met through courses), or an AND/OR of children.
export type PrereqNode =
    | string
    | boolean
    | { op: "and" | "or"; children: PrereqNode[] };

// Response item of GET /courses — just enough for the course picker.
export type CourseSummary = Pick<Course, "code" | "name" | "aliases">;

export type ScheduledCourse = {
    course: Course;
    section: Section | null; // null when the course has no listed times
};

export type Schedule = {
    courses: ScheduledCourse[];
    totalCredits: number;
    score?: number;
};

export type SearchCriteria = {
    major?: string;
    interests?: string[];
    neededBreadth?: string[];
    neededGenEd?: string[];
    maxDifficulty?: number;
    preferredTags?: string[];
    targetCreditsMin?: number;
    targetCreditsMax?: number;
    lockedCourses?: string[]; // every schedule must include these
    excludedCourses?: string[]; // never suggested
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
