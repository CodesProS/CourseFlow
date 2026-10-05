import { useMemo, useState } from "react";
import type { ScheduledCourse } from "./types";

import SearchForm from "./components/SearchForm";
import ResultsHeader from "./components/ResultsHeader";
import ScheduleList from "./components/ScheduleList";
import ScheduleGrid from "./components/ScheduleGrid";
import CourseDetails from "./components/CourseDetails";
import CourseChoicesBar from "./components/CourseChoicesBar";
import { useCourses, usePlanMutation, type PlanPayload } from "./api/hooks";
import "./App.css";

function EmptyState() {
  return (
    <div className="panel empty-state">
      <h2>Plan your next semester</h2>
      <p>CourseFlow finds the best conflict-free schedules from the UW–Madison catalog.</p>
      <ol className="empty-steps">
        <li>
          <strong>Add what you&apos;ve taken</strong>
          <span>Import your transcript or pick courses, so prerequisites are checked.</span>
        </li>
        <li>
          <strong>Set your preferences</strong>
          <span>Interests, breadth or gen-ed you still need, and a credit range.</span>
        </li>
        <li>
          <strong>Generate</strong>
          <span>Browse the top-scoring schedules on a weekly timetable.</span>
        </li>
      </ol>
    </div>
  );
}

function StatusPanel({ title, message, tone }: { title: string; message: string; tone?: "error" }) {
  return (
    <div className={`panel status-panel${tone ? ` ${tone}` : ""}`}>
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  );
}

export default function App() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCourse, setSelectedCourse] = useState<ScheduledCourse | null>(null);
  // Courses the student locked in (every schedule includes them) or
  // excluded (never suggested). A course is in at most one list.
  const [lockedCourses, setLockedCourses] = useState<string[]>([]);
  const [excludedCourses, setExcludedCourses] = useState<string[]>([]);
  // The last search, so locking a course can re-run it immediately.
  const [lastPayload, setLastPayload] = useState<PlanPayload | null>(null);
  const planMutation = usePlanMutation();
  const coursesQuery = useCourses();
  const schedules = planMutation.data?.schedules;
  const currentSchedule = schedules?.[currentIndex] ?? null;

  // When most of a schedule's courses have no listed times, the calendar
  // shows little; lead with the course list instead.
  const timedCount = currentSchedule?.courses.filter((c) => c.section).length ?? 0;
  const listFirst = currentSchedule !== null && timedCount * 2 < currentSchedule.courses.length;

  // What the student has taken, under every code a cross-listed course goes
  // by, so the details dialog can tick off prerequisites.
  const completedCourses = useMemo(() => {
    const completed = new Set(lastPayload?.completedCourses ?? []);
    for (const c of coursesQuery.data ?? []) {
      const codes = [c.code, ...(c.aliases ?? [])];
      if (codes.some((code) => completed.has(code))) codes.forEach((code) => completed.add(code));
    }
    return completed;
  }, [lastPayload, coursesQuery.data]);

  const plan = (payload: PlanPayload, locked: string[], excluded: string[]) => {
    setCurrentIndex(0);
    planMutation.mutate({
      ...payload,
      criteria: { ...payload.criteria, lockedCourses: locked, excludedCourses: excluded },
    });
  };

  const handleGenerate = (payload: PlanPayload) => {
    setLastPayload(payload);
    plan(payload, lockedCourses, excludedCourses);
  };

  // Locking or excluding a course re-runs the last search right away.
  const updateChoices = (locked: string[], excluded: string[]) => {
    setLockedCourses(locked);
    setExcludedCourses(excluded);
    if (lastPayload) plan(lastPayload, locked, excluded);
  };

  const toggleLock = (code: string) => {
    if (lockedCourses.includes(code)) {
      updateChoices(lockedCourses.filter((c) => c !== code), excludedCourses);
    } else {
      updateChoices([...lockedCourses, code], excludedCourses.filter((c) => c !== code));
    }
  };

  const toggleExclude = (code: string) => {
    if (excludedCourses.includes(code)) {
      updateChoices(lockedCourses, excludedCourses.filter((c) => c !== code));
    } else {
      updateChoices(lockedCourses.filter((c) => c !== code), [...excludedCourses, code]);
      // The course is leaving the schedule, so its details don't apply.
      setSelectedCourse(null);
    }
  };
  const lockedSet = new Set(lockedCourses);

  let results;
  if (planMutation.isPending) {
    results = <StatusPanel title="Finding schedules…" message="Checking prerequisites and time conflicts." />;
  } else if (planMutation.isError) {
    results = (
      <StatusPanel
        tone="error"
        title="Couldn't generate schedules"
        message={`${planMutation.error.message}. The API may be waking up; try again in a moment.`}
      />
    );
  } else if (!schedules) {
    results = <EmptyState />;
  } else if (schedules.length === 0 || !currentSchedule) {
    results = (
      <StatusPanel
        title="No schedules fit"
        message={
          lockedCourses.length > 0
            ? "Your locked courses may clash with each other or not fit your credit range. Try unlocking one or widening the range."
            : "Try widening the credit range, raising max difficulty, or removing a requirement."
        }
      />
    );
  } else {
    const courseList = (
      <ScheduleList
        schedule={currentSchedule}
        onSelectCourse={setSelectedCourse}
        lockedCourses={lockedSet}
        onToggleLock={toggleLock}
        onExclude={toggleExclude}
      />
    );
    results = (
      <>
        <ResultsHeader
          schedule={currentSchedule}
          currentIndex={currentIndex}
          total={schedules.length}
          onPrevious={() => setCurrentIndex((i) => Math.max(i - 1, 0))}
          onNext={() => setCurrentIndex((i) => Math.min(i + 1, schedules.length - 1))}
        />
        {listFirst ? (
          <>
            {courseList}
            <ScheduleGrid schedule={currentSchedule} onSelectCourse={setSelectedCourse} showUntimed={false} />
          </>
        ) : (
          <>
            <ScheduleGrid schedule={currentSchedule} onSelectCourse={setSelectedCourse} />
            {courseList}
          </>
        )}
      </>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          CourseFlow
        </div>
        <span className="topbar-tagline">Conflict-free schedules for UW–Madison</span>
      </header>

      <main className="layout">
        <aside className="sidebar">
          <SearchForm onGenerate={handleGenerate} isSubmitting={planMutation.isPending} />
        </aside>
        <section className="results">
          {(lockedCourses.length > 0 || excludedCourses.length > 0) && (
            <CourseChoicesBar
              lockedCourses={lockedCourses}
              excludedCourses={excludedCourses}
              onUnlock={toggleLock}
              onUnexclude={toggleExclude}
            />
          )}
          {results}
        </section>
      </main>

      <CourseDetails
        scheduledCourse={selectedCourse}
        onClose={() => setSelectedCourse(null)}
        completedCourses={completedCourses}
        lockedCourses={lockedSet}
        onToggleLock={toggleLock}
        onExclude={toggleExclude}
      />
    </div>
  );
}
