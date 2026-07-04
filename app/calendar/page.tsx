"use client";

import { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import { apiFetch } from "@/lib/api";

type CalendarData = {
  year: number;
  month: number;
  summary: {
    totalCompleted: number;
    totalExp: number;
    totalGold: number;
    activeDays: number;
    totalDays: number;
  };
  calendar: {
    date: string;
    day: number;
    weekday: number;
    completedCount: number;
    expEarned: number;
    goldEarned: number;
    statEarned: number;
    intensity: number;
    missions: {
      id: string;
      title: string;
      difficulty: string;
      attribute: {
        name: string;
        icon?: string | null;
      };
    }[];
  }[];
};

function getIntensityClass(intensity: number) {
  if (intensity === 0) return "bg-slate-950 border-slate-800";
  if (intensity === 1) return "bg-emerald-950/60 border-emerald-900/60";
  if (intensity === 2) return "bg-emerald-800/60 border-emerald-700/60";
  if (intensity === 3) return "bg-emerald-600/70 border-emerald-500/60";
  return "bg-emerald-400/80 border-emerald-300/60 text-slate-950";
}

export default function CalendarPage() {
  const [data, setData] = useState<CalendarData | null>(null);
  const [error, setError] = useState("");

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  async function loadCalendar(targetYear = year, targetMonth = month) {
    try {
      setError("");
      const result = await apiFetch<CalendarData>(
        `/api/calendar?year=${targetYear}&month=${targetMonth}`
      );
      setData(result);
    } catch (error: any) {
      setError(error.message);
    }
  }

  useEffect(() => {
    loadCalendar();
  }, []);

  function changeMonth(offset: number) {
    let nextYear = year;
    let nextMonth = month + offset;

    if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    }

    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }

    setYear(nextYear);
    setMonth(nextMonth);
    loadCalendar(nextYear, nextMonth);
  }

  const firstWeekday = data?.calendar[0]?.weekday ?? 0;

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <AppHeader title="Calendar" subtitle="Theo dõi lịch sử hoàn thành." />

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300">
            {error}
          </div>
        )}

        <section className="rounded-2xl bg-slate-900 border border-slate-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => changeMonth(-1)}
              className="rounded-xl border border-slate-700 px-4 py-2 hover:bg-slate-800"
            >
              ← Prev
            </button>

            <h2 className="text-xl font-bold">
              {year}-{String(month).padStart(2, "0")}
            </h2>

            <button
              onClick={() => changeMonth(1)}
              className="rounded-xl border border-slate-700 px-4 py-2 hover:bg-slate-800"
            >
              Next →
            </button>
          </div>

          {data && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="rounded-xl bg-slate-950 border border-slate-800 p-4">
                  <div className="text-sm text-slate-400">Completed</div>
                  <div className="text-2xl font-bold mt-1">
                    {data.summary.totalCompleted}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-950 border border-slate-800 p-4">
                  <div className="text-sm text-slate-400">Active Days</div>
                  <div className="text-2xl font-bold mt-1">
                    {data.summary.activeDays}/{data.summary.totalDays}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-950 border border-slate-800 p-4">
                  <div className="text-sm text-slate-400">EXP</div>
                  <div className="text-2xl font-bold mt-1">
                    +{data.summary.totalExp}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-950 border border-slate-800 p-4">
                  <div className="text-sm text-slate-400">Gold</div>
                  <div className="text-2xl font-bold mt-1">
                    🪙 {data.summary.totalGold}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2 text-center text-sm text-slate-400 mb-2">
                <div>Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: firstWeekday }).map((_, index) => (
                  <div key={`empty-${index}`} />
                ))}

                {data.calendar.map((day) => (
                  <div
                    key={day.date}
                    title={`${day.date}: ${day.completedCount} missions`}
                    className={`min-h-24 rounded-xl border p-2 ${getIntensityClass(
                      day.intensity
                    )}`}
                  >
                    <div className="font-bold">{day.day}</div>
                    <div className="text-xs mt-1">
                      {day.completedCount > 0
                        ? `${day.completedCount} done`
                        : "—"}
                    </div>
                    <div className="text-xs mt-1 opacity-80">
                      +{day.expEarned} EXP
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}