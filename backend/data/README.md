# Course data

`courses.json` and `subjects.json` are **derived artifacts**. They're regenerated
by `npm run ingest` from a local clone of
[uw-coursemap-data](https://github.com/twangodev/uw-coursemap-data), and then
committed so that the app can boot without any external dependency. Nothing is
fetched at runtime: the backend reads these files once at startup.

## Regenerating

The full repo is ~2 GB with history, but ingest only reads `course/*.json`,
`course/<COURSE>/meetings.json`, and `subjects.json`. A shallow sparse clone
of just those is ~150 MB:

```bash
# 1. Clone next to CourseFlow/ (where ingest looks by default)
git clone --depth 1 --filter=blob:none --sparse \
  https://github.com/twangodev/uw-coursemap-data.git ../uw-coursemap-data
cd ../uw-coursemap-data
git sparse-checkout set --no-cone '/course/*.json' '/course/*/meetings.json' '/subjects.json'

# 2. Run ingest
cd ../CourseFlow/backend
npm run ingest
```

Cloned somewhere else? Point at it with `UW_COURSEMAP_DATA=/path/to/clone`.

## What the script does

See `backend/src/scripts/ingest.ts` — it's heavily commented. Summary:

1. Walks `uw-coursemap-data/course/` (every subject).
2. Keeps undergraduate courses (number < 700) that are still being taught:
   either they have meeting data, or they were taught since Fall 2022.
3. Transforms each record: normalizes the code (plus aliases for
   cross-listed courses), resolves the prerequisite syntax tree into AND/OR
   of course codes, maps breadth/gen-ed flags, turns session timestamps into
   weekly recurring patterns, computes average GPA from the historical grade
   distribution, and keeps the catalog description.
4. Writes sorted output to `courses.json` (one course per line) and the
   subject-code → department-name map to `subjects.json`.

## Known simplifications

- **Most courses have no meeting times.** The source only has them for a few
  hundred courses. The rest are kept with empty `sections`; the planner can
  still suggest them, but they show as "time not listed" instead of on the
  timetable, and can't be checked for clashes.
- **Credits are estimated for most courses.** The source only has credit
  counts for recently enrolled courses; the rest assume 3 and carry
  `creditsEstimated: true`.
- **Non-course prerequisites are approximated.** Class standing and Comm-A/QR
  are assumed met; consent of instructor, graduate standing, program
  declarations, and placement tests are assumed unmet. Courses that can only
  be taken through those routes are never suggested.
- Only lecture (LEC) sections are kept. Lab/discussion coupling is future work.
- Breadth is inferred from subject for a handful of subjects (see
  `BREADTH_BY_SUBJECT` in `ingest.ts`) because the real UW breadth codes
  aren't exposed in uw-coursemap-data.
