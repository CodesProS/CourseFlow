// Thin fetch wrapper. Hooks call this; components never touch fetch directly.

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

export class ApiError extends Error {
    status: number;

    constructor(status: number, message: string) {
        super(message);
        this.name = "ApiError";
        this.status = status;
    }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
        headers: { "Content-Type": "application/json" },
        ...init,
    });

    if (!res.ok) {
        // Try to pull { error } out of the body; fall back to status text.
        let message = res.statusText;
        try {
            const body = await res.json();
            if (body?.error) message = body.error;
        } catch {
            // body wasn't JSON, keep statusText
        }
        throw new ApiError(res.status, message);
    }

    return res.json() as Promise<T>;
}

export const api = {
    get: <T>(path: string) => request<T>(path),
    post: <T>(path: string, body: unknown) =>
        request<T>(path, { method: "POST", body: JSON.stringify(body) }),
};
