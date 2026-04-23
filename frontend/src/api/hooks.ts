import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "./client";
import type {
    Course,
    CoursesMeta,
    PlanResponse,
    SearchCriteria,
} from "../types";

// GET /courses — full catalog. Rarely changes; cache aggressively.
export function useCourses() {
    return useQuery({
        queryKey: ["courses"],
        queryFn: () => api.get<Course[]>("/courses"),
        staleTime: 1000 * 60 * 60, // 1 hour — catalog is static between ingests
    });
}

// GET /courses/meta — distinct breadth/genEd/tag values for form autocompletes.
export function useCoursesMeta() {
    return useQuery({
        queryKey: ["courses", "meta"],
        queryFn: () => api.get<CoursesMeta>("/courses/meta"),
        staleTime: 1000 * 60 * 60,
    });
}

export type PlanPayload = {
    completedCourses: string[];
    criteria: SearchCriteria;
};

// POST /plan — runs the backtracker, returns up to MAX_SCHEDULES results.
export function usePlanMutation() {
    return useMutation({
        mutationFn: (payload: PlanPayload) =>
            api.post<PlanResponse>("/plan", payload),
    });
}
