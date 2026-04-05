import { Course } from "../models/Course";

export const courses: Course[] = [
    {
        code: "CS200",
        name: "Programming I",
        credits: 3,
        difficulty: 1,
        tags: ["Programming"],
        prerequisites: [],
        sections: [
            {
                sectionId: "001",
                type: "Lecture",
                meetings: [
                    { day: "Mon", startTime: "09:00", endTime: "09:50" },
                    { day: "Wed", startTime: "09:00", endTime: "09:50" },
                    { day: "Fri", startTime: "09:00", endTime: "09:50" },
                ],
            },
            {
                sectionId: "002",
                type: "Lecture",
                meetings: [
                    { day: "Tue", startTime: "11:00", endTime: "12:15" },
                    { day: "Thu", startTime: "11:00", endTime: "12:15" },
                ],
            },
        ],
    },
    {
        code: "CS300",
        name: "Programming II",
        credits: 3,
        difficulty: 2,
        tags: ["Programming"],
        breadth: "Natural Science",
        genEd: ["QR-B"],
        creditType: "L&S",
        prerequisites: ["CS200"],
        sections: [
            {
                sectionId: "001",
                type: "Lecture",
                meetings: [
                    { day: "Mon", startTime: "10:00", endTime: "10:50" },
                    { day: "Wed", startTime: "10:00", endTime: "10:50" },
                    { day: "Fri", startTime: "10:00", endTime: "10:50" },
                ],
            },
            {
                sectionId: "002",
                type: "Lecture",
                meetings: [
                    { day: "Tue", startTime: "14:30", endTime: "15:45" },
                    { day: "Thu", startTime: "14:30", endTime: "15:45" },
                ],
            },
        ],
    },
    {
        code: "CS400",
        name: "Programming III",
        credits: 3,
        difficulty: 3,
        tags: ["Systems"],
        prerequisites: ["CS300"],
        sections: [
            {
                sectionId: "001",
                type: "Lecture",
                meetings: [
                    { day: "Mon", startTime: "11:00", endTime: "11:50" },
                    { day: "Wed", startTime: "11:00", endTime: "11:50" },
                    { day: "Fri", startTime: "11:00", endTime: "11:50" },
                ],
            },
            {
                sectionId: "002",
                type: "Lecture",
                meetings: [
                    { day: "Tue", startTime: "09:30", endTime: "10:45" },
                    { day: "Thu", startTime: "09:30", endTime: "10:45" },
                ],
            },
        ],
    },
    {
        code: "CS354",
        name: "Machine Organization",
        credits: 3,
        difficulty: 3,
        tags: ["Systems"],
        prerequisites: ["CS300"],
        sections: [
            {
                sectionId: "001",
                type: "Lecture",
                meetings: [
                    { day: "Mon", startTime: "13:00", endTime: "13:50" },
                    { day: "Wed", startTime: "13:00", endTime: "13:50" },
                    { day: "Fri", startTime: "13:00", endTime: "13:50" },
                ],
            },
        ],
    },
    {
        code: "CS540",
        name: "Introduction to Artificial Intelligence",
        credits: 4,
        difficulty: 3,
        tags: ["AI"],
        prerequisites: ["CS400"],
        sections: [
            {
                sectionId: "001",
                type: "Lecture",
                meetings: [
                    { day: "Tue", startTime: "12:00", endTime: "13:15" },
                    { day: "Thu", startTime: "12:00", endTime: "13:15" },
                ],
            },
        ],
    },
    {
        code: "CS577",
        name: "Algorithms",
        credits: 3,
        difficulty: 3,
        tags: ["Theory"],
        prerequisites: ["CS400", "MATH240"],
        sections: [
            {
                sectionId: "001",
                type: "Lecture",
                meetings: [
                    { day: "Mon", startTime: "14:00", endTime: "14:50" },
                    { day: "Wed", startTime: "14:00", endTime: "14:50" },
                    { day: "Fri", startTime: "14:00", endTime: "14:50" },
                ],
            },
        ],
    },
    {
        code: "MATH221",
        name: "Calculus I",
        credits: 5,
        difficulty: 2,
        tags: ["Math"],
        breadth: "Natural Science",
        genEd: ["QR-A"],
        creditType: "L&S",
        prerequisites: [],
        sections: [
            {
                sectionId: "001",
                type: "Lecture",
                meetings: [
                    { day: "Mon", startTime: "08:00", endTime: "08:50" },
                    { day: "Wed", startTime: "08:00", endTime: "08:50" },
                    { day: "Fri", startTime: "08:00", endTime: "08:50" },
                ],
            },
        ],
    },
    {
        code: "MATH222",
        name: "Calculus II",
        credits: 4,
        difficulty: 2,
        tags: ["Math"],
        prerequisites: ["MATH221"],
        sections: [
            {
                sectionId: "001",
                type: "Lecture",
                meetings: [
                    { day: "Tue", startTime: "10:00", endTime: "11:15" },
                    { day: "Thu", startTime: "10:00", endTime: "11:15" },
                ],
            },
        ],
    },
    {
        code: "MATH240",
        name: "Linear Algebra",
        credits: 3,
        difficulty: 2,
        tags: ["Math"],
        prerequisites: ["MATH221"],
        sections: [
            {
                sectionId: "001",
                type: "Lecture",
                meetings: [
                    { day: "Mon", startTime: "12:00", endTime: "12:50" },
                    { day: "Wed", startTime: "12:00", endTime: "12:50" },
                    { day: "Fri", startTime: "12:00", endTime: "12:50" },
                ],
            },
        ],
    },
    {
        code: "STAT324",
        name: "Intro to Applied Statistics",
        credits: 3,
        difficulty: 2,
        tags: ["Data"],
        prerequisites: ["MATH221"],
        sections: [
            {
                sectionId: "001",
                type: "Lecture",
                meetings: [
                    { day: "Tue", startTime: "15:00", endTime: "16:15" },
                    { day: "Thu", startTime: "15:00", endTime: "16:15" },
                ],
            },
        ],
    },
    {
        code: "LIT200",
        name: "Introduction to Literature",
        credits: 3,
        difficulty: 1,
        tags: ["Humanities"],
        breadth: "Humanities",
        creditType: "L&S",
        prerequisites: [],
        sections: [
            {
                sectionId: "001",
                type: "Lecture",
                meetings: [
                    { day: "Mon", startTime: "15:00", endTime: "15:50" },
                    { day: "Wed", startTime: "15:00", endTime: "15:50" },
                ],
            },
        ],
    },
    {
        code: "HIST101",
        name: "World History",
        credits: 3,
        difficulty: 1,
        tags: ["Humanities"],
        breadth: "Humanities",
        creditType: "L&S",
        prerequisites: [],
        sections: [
            {
                sectionId: "001",
                type: "Lecture",
                meetings: [
                    { day: "Tue", startTime: "13:30", endTime: "14:45" },
                    { day: "Thu", startTime: "13:30", endTime: "14:45" },
                ],
            },
        ],
    },
    {
        code: "SOC134",
        name: "Sociology of Race",
        credits: 3,
        difficulty: 1,
        tags: ["Social Science"],
        breadth: "Social Science",
        genEd: ["Ethnic Studies"],
        creditType: "L&S",
        prerequisites: [],
        sections: [
            {
                sectionId: "001",
                type: "Lecture",
                meetings: [
                    { day: "Mon", startTime: "16:00", endTime: "16:50" },
                    { day: "Wed", startTime: "16:00", endTime: "16:50" },
                ],
            },
        ],
    },
    {
        code: "PSYCH202",
        name: "Introduction to Psychology",
        credits: 3,
        difficulty: 1,
        tags: ["Social Science"],
        breadth: "Social Science",
        creditType: "L&S",
        prerequisites: [],
        sections: [
            {
                sectionId: "001",
                type: "Lecture",
                meetings: [
                    { day: "Tue", startTime: "16:30", endTime: "17:45" },
                    { day: "Thu", startTime: "16:30", endTime: "17:45" },
                ],
            },
        ],
    },
];