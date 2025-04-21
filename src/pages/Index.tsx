import { useEffect, useState } from "react";
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
import {
  calculateTeamStats,
  getLatestCheckOut,
  getLiveActivity,
} from "@/lib/mock-data";
import { EmployeeStats, TeamStats } from "@/types";

const Dashboard = () => {
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

  // ─── Real work‑progress from server ────────────────────────────────
  const [inTime, setInTime] = useState<Date | null>(null);
  const [hoursWorked, setHoursWorked] = useState(0);
  const [minutesLeft, setMinutesLeft] = useState(9 * 60);

  // ─── mock fallback for other cards ──────────────────────────────────
  const [currentUser] = useState(() => ({
    hoursWorkedToday: 0,
    minutesLeftToday: 9 * 60,
    punctualityScore: 0,
    consistencyStreak: { count: 0, isActive: false },
    isOnline: false,
    badges: [],
  }));

  // ─── Fetch work‑progress ───────────────────────────────────────────
  useEffect(() => {
    fetch("http://localhost:3001/api/work-progress?empCode=30874")
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then(({ inTime: str, hoursWorked, minutesLeft }) => {
        console.log("💡 Work‑progress from server:", {
          str,
          hoursWorked,
          minutesLeft,
        });
        setInTime(new Date(str));
        setHoursWorked(hoursWorked);
        setMinutesLeft(minutesLeft);
      })
      .catch((err) => console.error("Failed to load work‑progress:", err));
  }, []);

  // ─── Fetch earliest check‑in WITH firstname ────────────────────────
  useEffect(() => {
    fetch("http://localhost:3001/api/earliest-checkin")
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
      .catch((err) => console.error("Failed to load earliest check‑in:", err));
  }, [currentTime]);

  useEffect(() => {
    fetch("http://localhost:3001/api/latest-checkout")
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
      .catch((err) => console.error("Failed to load latest check‑out:", err));
  }, [currentTime]);

  // ─── Fetch Recent Activity ────────────────────────────────────────
  useEffect(() => {
    fetch("http://localhost:3001/api/recent-activity")
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then((records: { action: string; name: string; time: string }[]) => {
        // map into the LiveActivityFeed shape
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

  // ─── Refresh the rest every minute ─────────────────────────────────
  useEffect(() => {
    const update = () => {
      setEmployeeStats([]); // will wire up next
      setTeamStats(calculateTeamStats());
      setLatestCheckOut(latestCheckOut);
      setLiveActivity(getLiveActivity());
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

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">hrtwo by nav</h1>
          <div className="text-right">
            <p className="text-sm text-gray-500">Current Time</p>
            <p className="text-xl font-semibold">{formatTime(currentTime)}</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Your Status */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Your Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Work Progress */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Clock className="mr-2 h-5 w-5" /> Work Progress
                </CardTitle>
                <CardDescription>9‑hour shift</CardDescription>
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
                      {Math.floor(minutesLeft / 60)}h {minutesLeft % 60}m left
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Punctuality Score */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Award className="mr-2 h-5 w-5" />
                  Punctuality Score
                </CardTitle>
                <CardDescription>
                  Based on your on-time arrivals
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {currentUser.punctualityScore}%
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {currentUser.punctualityScore > 90
                    ? "Excellent! Keep it up!"
                    : currentUser.punctualityScore > 70
                    ? "Good standing"
                    : "Needs improvement"}
                </div>
              </CardContent>
            </Card>

            {/* Consistency Streak */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Timer className="mr-2 h-5 w-5" />
                  Consistency Streak
                </CardTitle>
                <CardDescription>Days at work in a row</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline">
                  <span className="text-3xl font-bold">
                    {currentUser.consistencyStreak.count}
                  </span>
                  <span className="ml-2 text-2xl">
                    {currentUser.consistencyStreak.count > 0 && "🔥"}
                  </span>
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {currentUser.consistencyStreak.isActive
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

        {/* Today's Highlights */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Today's Highlights
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Earliest Check‑in */}
            <Card>
              <CardHeader>
                <CardTitle>Earliest Check‑in</CardTitle>
                <CardDescription>First in the office today</CardDescription>
              </CardHeader>
              <CardContent>
                {earliestCheckIn ? (
                  <div className="flex items-center">
                    <div className="text-xl font-semibold mr-3">
                      {earliestCheckIn.employee.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatTime(earliestCheckIn.time)}
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500 italic">
                    No check‑ins yet today
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Latest Check‑out */}
            <Card>
              <CardHeader>
                <CardTitle>Latest Check‑out</CardTitle>
                <CardDescription>Last to leave yesterday</CardDescription>
              </CardHeader>
              <CardContent>
                {latestCheckOut ? (
                  <div className="flex items-center">
                    <div className="text-xl font-semibold mr-3">
                      {latestCheckOut.employee.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatTime(latestCheckOut.time)}
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500 italic">No data available</div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Employees at work right now</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {employeeStats.filter((stat) => stat.isOnline).length}
                  <span className="text-base text-gray-500 ml-2">
                    / {employeeStats.length}
                  </span>
                </div>
                <div className="mt-2">
                  <LiveActivityFeed activity={liveActivity} />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Leaderboards */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <PunctualityLeaderboard stats={employeeStats} />
          <ConsistencyLeaderboard stats={employeeStats} />
          <TeamLeaderboard teams={teamStats} />
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
