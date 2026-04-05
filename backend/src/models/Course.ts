export type Course = {
    code: string;
    name: string;
    credits: number;
    difficulty: number; // 1 Introductory, 2 Intermediate, 3 Advanced
    tags: string[]; // ["AI", "Systems"]
    breadth?: string; // "Humanities", "Social Science"
    genEd?: string[]; // ["Ethnic Studies"]
    creditType?: string; // "L&S"
    prerequisites: string[];
    sections: Section[];
};

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