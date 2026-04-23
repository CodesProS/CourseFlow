import { useMemo, useState } from "react";
import type { Schedule, SearchCriteria } from "./types";

import SearchForm from "./components/SearchForm";
import ScheduleNavigator from "./components/ScheduleNavigator";
import ScheduleList from "./components/ScheduleList";
import ScheduleGrid from "./components/ScheduleGrid";
import { usePlanMutation } from "./api/hooks";
import "./App.css";

export default function App() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const planMutation = usePlanMutation();
  const schedules: Schedule[] = planMutation.data?.schedules ?? [];

  const currentSchedule = useMemo(() => {
    if (schedules.length === 0) return null;
    return schedules[currentIndex] ?? null;
  }, [schedules, currentIndex]);

  const handleGenerate = (payload: {
    completedCourses: string[];
    criteria: SearchCriteria;
  }) => {
    setCurrentIndex(0);
    planMutation.mutate(payload);
  };

  const statusText = (() => {
    if (planMutation.isPending) return "Generating…";
    if (planMutation.isError) return `Error: ${planMutation.error.message}`;
    if (!planMutation.isSuccess) return "Fill out your preferences, then click Generate.";
    if (schedules.length === 0) return "No valid schedules found — try loosening your constraints.";
    return `${schedules.length} valid schedule(s) found.`;
  })();

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>CourseFlow</h1>
        <p>Generate ranked, conflict-free schedules from your UW-Madison course preferences.</p>
      </header>

      <main className="app-layout">
        <aside className="sidebar">
          <SearchForm onGenerate={handleGenerate} isSubmitting={planMutation.isPending} />
        </aside>

        <section className="content">
          <div className="panel">
            <h3>Results</h3>
            <p>{statusText}</p>
          </div>

          <ScheduleNavigator
            currentIndex={currentIndex}
            total={schedules.length}
            onPrevious={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
            onNext={() =>
              setCurrentIndex((prev) => Math.min(prev + 1, schedules.length - 1))
            }
          />

          <ScheduleGrid schedule={currentSchedule} />
          <ScheduleList schedule={currentSchedule} />
        </section>
      </main>
    </div>
  );
}
