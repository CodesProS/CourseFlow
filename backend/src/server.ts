/**
 * server.ts — HTTP entry point.
 *
 * Express is a tiny framework built around the idea of a "middleware
 * pipeline": a request flows through a chain of functions, each of
 * which can inspect/modify it and either pass it on to the next
 * function (`next()`) or respond (`res.json()`, etc.) and short-circuit.
 *
 * The pipeline in this file, in order:
 *   1. CORS       — add Access-Control-Allow-Origin headers so the
 *                   browser lets the frontend (a different origin)
 *                   call us at all.
 *   2. JSON body  — parse `Content-Type: application/json` request
 *                   bodies into req.body as an object.
 *   3. Logger     — log method + path for every request.
 *   4. Healthcheck, resource routers, 404 handler, error handler.
 *
 * Order matters: middlewares run top-to-bottom. If logger came before
 * JSON-body, req.body would be undefined when logged.
 */

import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import coursesRouter from "./routes/courses";
import planRouter from "./routes/plan";

const app = express();

/** Port: env var overrides, default 3001 (so it doesn't clash with the
 *  Vite dev server on 5173). */
const PORT = Number(process.env.PORT ?? 3001);

// ----- Middleware pipeline -----

// CORS: in production you'd restrict `origin` to your deployed frontend
// URL. For local dev we allow everything — no credentials involved, so
// the risk is low.
app.use(cors());

// JSON parsing: 1 MB cap protects against giant payload DoS.
app.use(express.json({ limit: "1mb" }));

// Tiny request logger. Fine for MVP; a real product would use `pino`
// or `morgan` with structured JSON logs.
app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
});

// ----- Routes -----

/** Healthcheck — load balancers and deployment platforms (Fly.io,
 * Railway, etc.) probe this to decide if the container is alive. */
app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "courseflow-backend" });
});

app.use("/courses", coursesRouter);
app.use("/plan", planRouter);

// ----- Fallthrough handlers -----

// 404: any path that didn't match a route above lands here. Must be
// registered AFTER all real routes.
app.use((_req, res) => {
    res.status(404).json({ error: "not found" });
});

// Error handler: Express identifies this specifically by its 4-arg
// signature. If any upstream middleware calls `next(err)` or throws
// synchronously, execution jumps here. Must be registered LAST.
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[error]", err);
    res.status(500).json({ error: err.message ?? "internal error" });
});

// ----- Start -----

app.listen(PORT, () => {
    console.log(`CourseFlow API listening on http://localhost:${PORT}`);
});
