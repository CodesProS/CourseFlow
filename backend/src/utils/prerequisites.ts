import { Course, PrereqNode } from "../models/Course";

function satisfied(node: PrereqNode, completed: Set<string>): boolean {
    if (typeof node === "boolean") return node;
    if (typeof node === "string") return completed.has(node);
    return node.op === "and"
        ? node.children.every((child) => satisfied(child, completed))
        : node.children.some((child) => satisfied(child, completed));
}

export function canTakeCourse(course: Course, completedCourses: Set<string>): boolean {
    // No tree means no course requirement.
    return course.prerequisiteTree === undefined
        ? true
        : satisfied(course.prerequisiteTree, completedCourses);
}
