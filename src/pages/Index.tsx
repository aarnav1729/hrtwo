// src/pages/Index.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Clock, Award, Timer, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PunctualityLeaderboard } from "@/components/PunctualityLeaderboard";
import { ConsistencyLeaderboard } from "@/components/ConsistencyLeaderboard";
import { TeamLeaderboard } from "@/components/TeamLeaderboard";
import { BadgeDisplay } from "@/components/BadgeDisplay";
import { LiveActivityFeed } from "@/components/LiveActivityFeed";
import { EmployeeStats, TeamStats } from "@/types";

const Dashboard = () => {
  const auth = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("auth") || "null");
    } catch {
      return null;
    }
  }, []);
  const empId: string = auth?.empID || "";
  const userName: string = auth?.firstname || auth?.name || "";

  const [employeeStats, setEmployeeStats] = useState<EmployeeStats[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStats[]>([]);
  const [earliestCheckIn, setEarliestCheckIn] = useState<{
    employee: any;
    time: Date;
  } | null>(null);
  const [latestCheckOut, setLatestCheckOut] = useState<{
    employee: any;
    time: Date;
  } | null>(null);
  const [liveActivity, setLiveActivity] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // ─── Work-progress from server ─────────────────────────────────────
  const [inTime, setInTime] = useState<Date | null>(null);
  const [hoursWorked, setHoursWorked] = useState(0);
  const [minutesLeft, setMinutesLeft] = useState(9 * 60);

  // Consistency streak state
  const [consistencyStreak, setConsistencyStreak] = useState<{
    count: number;
    isActive: boolean;
  }>({ count: 0, isActive: false });

  // NEW: last 50 punches
  const [punches, setPunches] = useState<Array<{ time: Date; action: string }>>(
    []
  );
  // Minutes spent OUT (from server)
  const [minutesOut, setMinutesOut] = useState(0);

  // Derive punctuality from today's first IN
  const punctualityScore = useMemo(() => {
    if (!inTime) return 0;
    const cutoff = new Date(inTime);
    cutoff.setHours(9, 15, 0, 0); // 9:15 AM cutoff
    return inTime <= cutoff ? 100 : 60;
  }, [inTime]);

  // ─── mock fallback for badges only ─────────────────────────────────
  const [currentUser] = useState(() => ({
    badges: [],
  }));

  // ─── Fetch work-progress ───────────────────────────────────────────
  useEffect(() => {
    if (!empId) return;
    fetch(`/api/work-progress?empCode=${encodeURIComponent(empId)}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then(({ inTime: str, hoursWorked, minutesLeft }) => {
        setInTime(new Date(str));
        setHoursWorked(hoursWorked);
        setMinutesLeft(minutesLeft);
      })
      .catch((err) => console.error("Failed to load work-progress:", err));
  }, [empId]);

  // ─── Fetch minutes-out ───────────────────────────────────────────────
  useEffect(() => {
    if (!empId) return;

    fetch(`/api/minutes-out?empCode=${encodeURIComponent(empId)}`)
      .then((res) => res.json())
      .then(({ totalMinutesOut }) => setMinutesOut(totalMinutesOut))
      .catch((err) => console.error("Failed to load minutes-out:", err));
  }, [empId]);

  // ─── Fetch earliest check-in WITH firstname ────────────────────────
  useEffect(() => {
    fetch(`/api/earliest-checkin`)
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then(({ name, checkInTime }) => {
        setEarliestCheckIn({
          employee: { name },
          time: new Date(checkInTime),
        });
      })
      .catch((err) => console.error("Failed to load earliest check-in:", err));
  }, [currentTime]);

  // ─── Fetch latest check-out ────────────────────────────────────────
  useEffect(() => {
    fetch(`/api/latest-checkout`)
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then(({ name, checkOutTime }) => {
        setLatestCheckOut({
          employee: { name },
          time: new Date(checkOutTime),
        });
      })
      .catch((err) => console.error("Failed to load latest check-out:", err));
  }, [currentTime]);

  // ─── Fetch Recent Activity ─────────────────────────────────────────
  useEffect(() => {
    fetch(`/api/recent-activity`)
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then((records: { action: string; name: string; time: string }[]) => {
        setLiveActivity(
          records.map((r) => ({
            action: r.action === "in" ? "check-in" : "check-out",
            employee: { name: r.name },
            time: new Date(r.time),
          }))
        );
      })
      .catch((err) => console.error("Failed to load recent activity:", err));
  }, [currentTime]);

  // ─── Fetch consistency streak ──────────────────────────────────────
  useEffect(() => {
    if (!empId) return;
    fetch(`/api/consistency-streak?empCode=${encodeURIComponent(empId)}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then(({ count, isActive }) => {
        setConsistencyStreak({ count, isActive });
      })
      .catch((err) => console.error("Failed to load consistency streak:", err));
  }, [empId]);

  // ─── Dept team stats for logged-in user ────────────────────────────
  useEffect(() => {
    if (!empId) return;
    fetch(`/api/team-punctuality?empId=${encodeURIComponent(empId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.teams)) setTeamStats(data.teams);
        if (Array.isArray(data?.members)) setEmployeeStats(data.members);
      })
      .catch((e) => console.warn("team-punctuality failed:", e));
  }, [empId]);

  // NEW: Fetch last 50 punches
  useEffect(() => {
    if (!empId) return;
    fetch(
      `/api/punches?empCode=${encodeURIComponent(
        empId
      )}&limit=${encodeURIComponent(50)}`
    )
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then((rows: Array<{ time: string; action: string }>) =>
        setPunches(
          rows.map((r) => ({
            time: new Date(r.time),
            action: r.action,
          }))
        )
      )
      .catch((err) => console.error("Failed to load punches:", err));
  }, [empId]);

  // ─── Refresh the rest every minute ─────────────────────────────────
  useEffect(() => {
    const update = () => {
      setLatestCheckOut((prev) => prev);
      setLiveActivity((prev) => prev);
      setCurrentTime(new Date());
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  // ─── Determine “At Work” status ────────────────────────────────────
  const isOnline =
    inTime !== null && inTime.toDateString() === new Date().toDateString();

  // ─── Time formatter ────────────────────────────────────────────────
  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const formatDateTime = (d: Date) =>
    d.toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">hrtwo by nav</h1>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-gray-500">Current Time</p>
              <p className="text-xl font-semibold">{formatTime(currentTime)}</p>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem("auth");
                window.location.replace("/");
              }}
              className="px-3 py-2 rounded-md border text-sm hover:bg-gray-50"
              aria-label="Logout"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Your Status */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Your Status: {userName}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Work Progress */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Clock className="mr-2 h-5 w-5" /> Work Progress
                </CardTitle>
                <CardDescription>9-hour shift</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Progress
                    value={((9 * 60 - minutesLeft) / (9 * 60)) * 100}
                    className="h-2"
                  />
                  <div className="flex justify-between text-sm">
                    <span>{hoursWorked.toFixed(1)} hours worked</span>
                    <span>
                      {Math.floor(minutesLeft / 60)}h{" "}
                      {Math.round(minutesLeft % 60)}m left
                    </span>
                  </div>

                  {/* Show actual check-in time */}
                  {inTime ? (
                    <div className="text-sm text-gray-600">
                      Checked in at{" "}
                      <span className="font-medium">{formatTime(inTime)}</span>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 italic">
                      Not checked in today
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Punctuality Score */}
            {/* Minutes Out */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Timer className="mr-2 h-5 w-5" /> Minutes Out
                </CardTitle>
                <CardDescription>
                  Total time spent outside today
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {Math.floor(minutesOut)} min
                </div>

                <div className="text-sm text-gray-500 mt-1">
                  {minutesOut === 0
                    ? "No breaks recorded"
                    : minutesOut < 30
                    ? "Great! Short breaks today"
                    : minutesOut < 60
                    ? "Moderate break duration"
                    : "Long break duration"}
                </div>
              </CardContent>
            </Card>

            {/* Consistency Streak */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Timer className="mr-2 h-5 w-5" /> Consistency Streak
                </CardTitle>
                <CardDescription>Days at work in a row</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline">
                  <span className="text-3xl font-bold">
                    {consistencyStreak.count}
                  </span>
                  <span className="ml-2 text-2xl">
                    {consistencyStreak.count > 0 && "🔥"}
                  </span>
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {consistencyStreak.isActive
                    ? "Active streak"
                    : "Streak ended"}
                </div>
              </CardContent>
            </Card>

            {/* Status */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  Status
                </CardTitle>
                <CardDescription>Your current status</CardDescription>
              </CardHeader>
              <CardContent>
                <Badge
                  className={`${
                    isOnline
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {isOnline ? "At Work" : "Not Checked In"}
                </Badge>
                <div className="mt-4">
                  <BadgeDisplay badges={currentUser.badges} />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* NEW: Last 50 Punches */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Punch History
          </h2>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Last 50 Punches</CardTitle>
              <CardDescription>Most recent first</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">
                        Date &amp; Time
                      </th>
                      <th className="px-3 py-2 text-left font-medium">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {punches.length === 0 ? (
                      <tr>
                        <td
                          colSpan={2}
                          className="px-3 py-4 text-gray-500 italic"
                        >
                          No punches found
                        </td>
                      </tr>
                    ) : (
                      punches.map((p, i) => (
                        <tr key={i} className="hover:bg-gray-50/60">
                          <td className="px-3 py-2">
                            {isNaN(p.time.getTime())
                              ? "-"
                              : formatDateTime(p.time)}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                p.action === "in"
                                  ? "bg-green-100 text-green-800"
                                  : p.action === "out"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {p.action === "in"
                                ? "In"
                                : p.action === "out"
                                ? "Out"
                                : p.action || "-"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        {/*
        // If you want to bring these back later:
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <PunctualityLeaderboard stats={employeeStats} />
          <ConsistencyLeaderboard stats={employeeStats} />
          <TeamLeaderboard teams={teamStats} />
        </section>
        */}
      </main>
    </div>
  );
};

export default Dashboard;
