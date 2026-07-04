"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import AppHeader from "@/components/AppHeader";

type DashboardData = {
    character: {
        id: string;
        name: string;
        className: string;
        level: number;
        exp: number;
        requiredExp: number;
        gold: number;
        avatarUrl?: string | null;
    };
    attributes: {
        id: string;
        name: string;
        value: number;
        icon?: string | null;
        color?: string | null;
    }[];
    todayMissions: {
        id: string;
        title: string;
        description?: string | null;
        difficulty: string;
        repeatType: string;
        expReward: number;
        goldReward: number;
        statReward: number;
        completed: boolean;
        attribute: {
            id: string;
            name: string;
            icon?: string | null;
            color?: string | null;
        };
    }[];
    streak: number;
    quote: {
        content: string;
        author?: string | null;
    } | null;
    summary: {
        totalMissionsToday: number;
        completedMissionsToday: number;
        completionRate: number;
    };
};

export default function DashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [error, setError] = useState("");
    const [completingId, setCompletingId] = useState<string | null>(null);
    const [rewardMessage, setRewardMessage] = useState("");

    async function loadDashboard() {
        try {
            const result = await apiFetch<DashboardData>("/api/dashboard");
            setData(result);
        } catch (error: any) {
            setError(error.message);
        }
    }

    useEffect(() => {
        loadDashboard();
    }, []);

    async function completeMission(id: string) {
        setCompletingId(id);
        setRewardMessage("");
        setError("");

        try {
            const result = await apiFetch<any>(`/api/missions/${id}/complete`, {
                method: "POST",
            });

            setRewardMessage(
                `+${result.reward.exp} EXP, +${result.reward.gold} Gold, ${result.reward.attributeName} +${result.reward.stat}`
            );

            await loadDashboard();
        } catch (error: any) {
            setError(error.message);
        } finally {
            setCompletingId(null);
        }
    }

    if (error && !data) {
        return (
            <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
                <div className="rounded-xl bg-slate-900 border border-slate-800 p-6">
                    <p className="text-red-300">{error}</p>
                    <div className="mt-4 flex gap-3">
                        <Link className="text-indigo-400" href="/login">
                            Login
                        </Link>
                        <Link className="text-indigo-400" href="/character/create">
                            Create Character
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    if (!data) {
        return (
            <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
                Loading...
            </main>
        );
    }

    const expPercent = Math.min(
        100,
        Math.round((data.character.exp / data.character.requiredExp) * 100)
    );

    return (
        <main className="min-h-screen bg-slate-950 text-white px-6 py-8">
            <div className="mx-auto max-w-6xl space-y-6">
                <AppHeader
                    title="Dashboard"
                    subtitle="Hôm nay bạn sẽ level up thế nào?"
                />

                {rewardMessage && (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-300">
                        Mission completed! {rewardMessage}
                    </div>
                )}

                {error && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300">
                        {error}
                    </div>
                )}

                <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 rounded-2xl bg-slate-900 border border-slate-800 p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="text-sm text-slate-400">
                                    {data.character.className}
                                </div>
                                <h2 className="text-3xl font-bold mt-1">
                                    {data.character.name}
                                </h2>
                                <div className="text-indigo-300 mt-1">
                                    Lv. {data.character.level}
                                </div>
                            </div>

                            <div className="text-5xl">🧙</div>
                        </div>

                        <div className="mt-6">
                            <div className="flex justify-between text-sm text-slate-400 mb-2">
                                <span>EXP</span>
                                <span>
                                    {data.character.exp} / {data.character.requiredExp}
                                </span>
                            </div>

                            <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
                                <div
                                    className="h-full bg-indigo-500"
                                    style={{ width: `${expPercent}%` }}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-6">
                            <div className="rounded-xl bg-slate-950 border border-slate-800 p-4">
                                <div className="text-slate-400 text-sm">Gold</div>
                                <div className="text-2xl font-bold mt-1">🪙 {data.character.gold}</div>
                            </div>

                            <div className="rounded-xl bg-slate-950 border border-slate-800 p-4">
                                <div className="text-slate-400 text-sm">Streak</div>
                                <div className="text-2xl font-bold mt-1">🔥 {data.streak} days</div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6">
                        <div className="text-sm text-slate-400">Quote hôm nay</div>
                        <p className="text-lg font-medium mt-3">
                            “{data.quote?.content || "Hãy hoàn thành một mission nhỏ hôm nay."}”
                        </p>
                    </div>
                </section>

                <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 rounded-2xl bg-slate-900 border border-slate-800 p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-xl font-bold">Today&apos;s Missions</h2>
                            <div className="text-sm text-slate-400">
                                {data.summary.completedMissionsToday}/
                                {data.summary.totalMissionsToday} completed
                            </div>
                        </div>

                        <div className="space-y-3">
                            {data.todayMissions.length === 0 && (
                                <div className="rounded-xl bg-slate-950 border border-slate-800 p-5 text-slate-400">
                                    Chưa có mission nào.{" "}
                                    <Link href="/missions" className="text-indigo-400">
                                        Tạo mission đầu tiên
                                    </Link>
                                </div>
                            )}

                            {data.todayMissions.map((mission) => (
                                <div
                                    key={mission.id}
                                    className="rounded-xl bg-slate-950 border border-slate-800 p-4 flex items-center justify-between gap-4"
                                >
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span>{mission.attribute.icon}</span>
                                            <h3
                                                className={`font-semibold ${mission.completed ? "line-through text-slate-500" : ""
                                                    }`}
                                            >
                                                {mission.title}
                                            </h3>
                                        </div>

                                        <div className="text-sm text-slate-400 mt-1">
                                            {mission.attribute.name} · {mission.difficulty} · +
                                            {mission.expReward} EXP · +{mission.goldReward} Gold
                                        </div>
                                    </div>

                                    <button
                                        disabled={mission.completed || completingId === mission.id}
                                        onClick={() => completeMission(mission.id)}
                                        className={`rounded-xl px-4 py-2 text-sm font-medium ${mission.completed
                                                ? "bg-emerald-500/20 text-emerald-300"
                                                : "bg-indigo-500 hover:bg-indigo-400"
                                            } disabled:opacity-70`}
                                    >
                                        {mission.completed
                                            ? "Done"
                                            : completingId === mission.id
                                                ? "..."
                                                : "Complete"}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6">
                        <h2 className="text-xl font-bold mb-5">Stats</h2>

                        <div className="space-y-3">
                            {data.attributes.map((attribute) => (
                                <div
                                    key={attribute.id}
                                    className="rounded-xl bg-slate-950 border border-slate-800 p-4 flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-2">
                                        <span>{attribute.icon}</span>
                                        <span>{attribute.name}</span>
                                    </div>

                                    <div className="font-bold">{attribute.value}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}