// HTTP entry point. Middleware order: cors -> json -> logger -> routes -> 404 -> errors.

import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import coursesRouter from "./routes/courses";
import planRouter from "./routes/plan";

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

// CORS_ORIGIN is a comma-separated list in prod (set on Fly). Falls back to
// wide-open for local dev so the Vite dev server on :5173 just works.
const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
    : true;

app.use(cors({ origin: corsOrigins }));
app.use(express.json({ limit: "1mb" }));

app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
});

app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "courseflow-backend" });
});

app.use("/courses", coursesRouter);
app.use("/plan", planRouter);

app.use((_req, res) => {
    res.status(404).json({ error: "not found" });
});

// Error handler — Express matches this by the 4-arg signature, must be last.
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[error]", err);
    res.status(500).json({ error: err.message ?? "internal error" });
});

// 0.0.0.0 so Docker/Fly can route external traffic to the container.
app.listen(PORT, "0.0.0.0", () => {
    console.log(`CourseFlow API listening on port ${PORT}`);
});
