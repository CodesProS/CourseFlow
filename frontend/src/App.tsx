import { useMemo, useState } from "react";
import type { Schedule } from "@backend/models/Schedule";
import type { SearchCriteria } from "@backend/models/SearchCriteria";

import SearchForm from "./components/SearchForm";
import ScheduleNavigator from "./components/ScheduleNavigator";
import ScheduleList from "./components/ScheduleList";
import ScheduleGrid from "./components/ScheduleGrid";
import { runPlanner } from "./services/plannerAdapter";
import "./App.css";

export default function App() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentSchedule = useMemo(() => {
    if (schedules.length === 0) return null;
    return schedules[currentIndex] ?? null;
  }, [schedules, currentIndex]);

  const handleGenerate = (payload: {
    completedCourses: string[];
    criteria: SearchCriteria;
  }) => {
    const generatedSchedules = runPlanner(payload);
    setSchedules(generatedSchedules);
    setCurrentIndex(0);
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>CourseFlow</h1>
        <p>Generate ranked, conflict-free schedules from your course preferences.</p>
      </header>

      <main className="app-layout">
        <aside className="sidebar">
          <SearchForm onGenerate={handleGenerate} />
        </aside>

        <section className="content">
          <div className="panel">
            <h3>Results</h3>
            <p>
              {schedules.length === 0
                ? "No schedules generated yet."
                : `${schedules.length} valid schedule(s) found.`}
            </p>
          </div>

          <ScheduleNavigator
            currentIndex={currentIndex}
            total={schedules.length}
            onPrevious={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
            onNext={() =>
              setCurrentIndex((prev) => Math.min(prev + 1, schedules.length - 1))
            }
          />

          <ScheduleList schedule={currentSchedule} />
          <ScheduleGrid schedule={currentSchedule} />
        </section>
      </main>
    </div>
  );
}