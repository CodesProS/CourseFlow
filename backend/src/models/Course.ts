export type Course = {
    code: string;
    // Other codes for the same cross-listed course: COMPSCI354 is also ECE354.
    aliases?: string[];
    name: string;
    credits: number;
    difficulty: number; // 1 Introductory, 2 Intermediate, 3 Advanced
    tags: string[]; // ["AI", "Systems"]
    breadth?: string; // "Humanities", "Social Science"
    genEd?: string[]; // ["Ethnic Studies"]
    creditType?: string; // "L&S"
    prerequisites: string[]; // every course code the requirement mentions
    // The actual rule, with AND/OR. Absent means no course requirement.
    prerequisiteTree?: PrereqNode;
    prerequisiteText?: string; // as UW words it, for display
    // Empty when the source has no meeting times ("time not listed").
    sections: Section[];
    description?: string; // catalog blurb from uw-coursemap-data
    avgGpa?: number; // historical average across all graded sections
    creditsEstimated?: boolean; // source had no credit count; 3 assumed
};

// A course code, a resolved non-course condition (e.g. "junior standing"
// -> true, "consent of instructor" -> false), or an AND/OR of children.
export type PrereqNode =
    | string
    | boolean
    | { op: "and" | "or"; children: PrereqNode[] };

export type MeetingTime = {
    day: string;       // "Mon", "Tue", "Wed", etc.
    startTime: string; // "10:00"
    endTime: string;   // "10:50"
};

export type Section = {
    sectionId: string;         // "001"
    type: string;              // "Lecture", "Discussion", "Lab"
    meetings: MeetingTime[];
};