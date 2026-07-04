"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { appPath } from "@/lib/paths";

type AppHeaderProps = {
    title: string;
    subtitle?: string;
};

function urlBase64ToUint8Array(value: string) {
    const padding = "=".repeat((4 - (value.length % 4)) % 4);
    const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let index = 0; index < rawData.length; index += 1) {
        outputArray[index] = rawData.charCodeAt(index);
    }

    return outputArray;
}

export default function AppHeader({ title, subtitle }: AppHeaderProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [notificationSupported] = useState(
        () =>
            typeof window !== "undefined" &&
            "serviceWorker" in navigator &&
            "PushManager" in window &&
            "Notification" in window
    );
    const [notificationSubscribed, setNotificationSubscribed] = useState(false);
    const [notificationLoading, setNotificationLoading] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        apiFetch<{ user: { role?: string } | null }>("/api/auth/me")
            .then((data) => setIsAdmin(data.user?.role === "ADMIN"))
            .catch(() => setIsAdmin(false));

        if (!notificationSupported) return;

        apiFetch<{ subscribed: boolean }>("/api/push/subscribe")
            .then((data) => setNotificationSubscribed(data.subscribed))
            .catch(() => setNotificationSubscribed(false));
    }, [notificationSupported]);

    async function handleLogout() {
        setLoggingOut(true);

        try {
            await apiFetch("/api/auth/logout", {
                method: "POST",
            });

            router.push("/login");
        } catch {
            router.push("/login");
        } finally {
            setLoggingOut(false);
        }
    }

    async function handleNotificationToggle() {
        if (!notificationSupported) return;

        setNotificationLoading(true);

        try {
            if (notificationSubscribed) {
                const registration = await navigator.serviceWorker.ready;
                const subscription = await registration.pushManager.getSubscription();

                await apiFetch("/api/push/subscribe", {
                    method: "DELETE",
                    body: JSON.stringify({
                        endpoint: subscription?.endpoint,
                    }),
                });

                await subscription?.unsubscribe();
                setNotificationSubscribed(false);
                return;
            }

            const permission = await Notification.requestPermission();

            if (permission !== "granted") {
                return;
            }

            const { publicKey } = await apiFetch<{ publicKey: string }>(
                "/api/push/subscribe"
            );
            const registration = await navigator.serviceWorker.register(
                appPath("/sw.js")
            );
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey),
            });

            await apiFetch("/api/push/subscribe", {
                method: "POST",
                body: JSON.stringify(subscription),
            });

            setNotificationSubscribed(true);
        } finally {
            setNotificationLoading(false);
        }
    }

    return (
        <header className="relative mb-6 rounded-2xl border border-slate-800 bg-white/80 px-4 py-4 shadow-xl backdrop-blur md:px-5">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
                        <span>⚡</span>
                        Daily Quest Hub
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-950">{title}</h1>
                    {subtitle && (
                        <p className="text-slate-400 text-sm md:text-base mt-1">
                            {subtitle}
                        </p>
                    )}
                </div>

                {/* Desktop menu */}
                <nav className="hidden md:flex items-center gap-3">
                    <Link
                        href="/dashboard"
                        className="rounded-xl border border-slate-700 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-800"
                    >
                        Dashboard
                    </Link>

                    <Link
                        href="/character/select"
                        className="rounded-xl border border-slate-700 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-800"
                    >
                        Characters
                    </Link>

                    <Link
                        href="/missions"
                        className="rounded-xl bg-indigo-500 px-4 py-2 font-medium hover:bg-indigo-400"
                    >
                        Missions
                    </Link>

                    <Link
                        href="/reports/weekly"
                        className="rounded-xl border border-slate-700 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-800"
                    >
                        Report
                    </Link>

                    <Link
                        href="/focus"
                        className="rounded-xl border border-slate-700 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-800"
                    >
                        Focus
                    </Link>

                    <Link
                        href="/calendar"
                        className="rounded-xl border border-slate-700 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-800"
                    >
                        Calendar
                    </Link>

                    {isAdmin && (
                        <Link
                            href="/admin"
                            className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 font-medium text-amber-700 hover:bg-amber-100"
                        >
                            Admin
                        </Link>
                    )}

                    {notificationSupported && (
                        <button
                            onClick={handleNotificationToggle}
                            disabled={notificationLoading}
                            className="rounded-xl border border-slate-700 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-800 disabled:opacity-50"
                        >
                            {notificationLoading
                                ? "..."
                                : notificationSubscribed
                                    ? "Notify on"
                                    : "Notify off"}
                        </button>
                    )}

                    <button
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className="rounded-xl border border-red-500/30 bg-white px-4 py-2 font-medium text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                    >
                        {loggingOut ? "..." : "Logout"}
                    </button>
                </nav>

                {/* Mobile burger button */}
                <button
                    type="button"
                    onClick={() => setOpen((value) => !value)}
                    className="md:hidden rounded-xl border border-slate-700 bg-white px-3 py-2 text-xl text-slate-800 hover:bg-slate-800"
                    aria-label="Open menu"
                >
                    {open ? "✕" : "☰"}
                </button>
            </div>

            {/* Mobile dropdown menu */}
            {open && (
                <div className="absolute right-0 top-full z-50 mt-3 w-56 rounded-2xl border border-slate-800 bg-slate-900 p-3 shadow-xl md:hidden">
                    <div className="flex flex-col gap-2">
                        <Link
                            href="/dashboard"
                            onClick={() => setOpen(false)}
                            className="rounded-xl px-4 py-3 font-medium text-slate-700 hover:bg-slate-800"
                        >
                            Dashboard
                        </Link>

                        <Link
                            href="/character/select"
                            onClick={() => setOpen(false)}
                            className="rounded-xl px-4 py-3 font-medium text-slate-700 hover:bg-slate-800"
                        >
                            Characters
                        </Link>

                        <Link
                            href="/missions"
                            onClick={() => setOpen(false)}
                            className="rounded-xl bg-indigo-500 px-4 py-3 font-medium hover:bg-indigo-400"
                        >
                            Missions
                        </Link>

                        <Link
                            href="/reports/weekly"
                            onClick={() => setOpen(false)}
                            className="rounded-xl px-4 py-3 font-medium text-slate-700 hover:bg-slate-800"
                        >
                            Report
                        </Link>

                        <Link
                            href="/focus"
                            onClick={() => setOpen(false)}
                            className="rounded-xl px-4 py-3 font-medium text-slate-700 hover:bg-slate-800"
                        >
                            Focus
                        </Link>

                        <Link
                            href="/calendar"
                            onClick={() => setOpen(false)}
                            className="rounded-xl px-4 py-3 font-medium text-slate-700 hover:bg-slate-800"
                        >
                            Calendar
                        </Link>

                        {isAdmin && (
                            <Link
                                href="/admin"
                                onClick={() => setOpen(false)}
                                className="rounded-xl px-4 py-3 font-medium text-amber-700 hover:bg-amber-100"
                            >
                                Admin
                            </Link>
                        )}

                        {notificationSupported && (
                            <button
                                onClick={handleNotificationToggle}
                                disabled={notificationLoading}
                                className="text-left rounded-xl px-4 py-3 font-medium text-slate-700 hover:bg-slate-800 disabled:opacity-50"
                            >
                                {notificationLoading
                                    ? "Updating..."
                                    : notificationSubscribed
                                        ? "Notifications on"
                                        : "Notifications off"}
                            </button>
                        )}

                        <button
                            onClick={handleLogout}
                            disabled={loggingOut}
                            className="text-left rounded-xl px-4 py-3 text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                        >
                            {loggingOut ? "Logging out..." : "Logout"}
                        </button>
                    </div>
                </div>
            )}
        </header>
    );
}
