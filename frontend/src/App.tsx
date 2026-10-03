import { useState } from "react";
import type { SearchCriteria } from "./types";

import SearchForm from "./components/SearchForm";
import ResultsHeader from "./components/ResultsHeader";
import ScheduleList from "./components/ScheduleList";
import ScheduleGrid from "./components/ScheduleGrid";
import { usePlanMutation } from "./api/hooks";
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
  const planMutation = usePlanMutation();
  const schedules = planMutation.data?.schedules;
  const currentSchedule = schedules?.[currentIndex] ?? null;

  const handleGenerate = (payload: { completedCourses: string[]; criteria: SearchCriteria }) => {
    setCurrentIndex(0);
    planMutation.mutate(payload);
  };

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
        message="Try widening the credit range, raising max difficulty, or removing a requirement."
      />
    );
  } else {
    results = (
      <>
        <ResultsHeader
          schedule={currentSchedule}
          currentIndex={currentIndex}
          total={schedules.length}
          onPrevious={() => setCurrentIndex((i) => Math.max(i - 1, 0))}
          onNext={() => setCurrentIndex((i) => Math.min(i + 1, schedules.length - 1))}
        />
        <ScheduleGrid schedule={currentSchedule} />
        <ScheduleList schedule={currentSchedule} />
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
        <section className="results">{results}</section>
      </main>
    </div>
  );
}
