
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmployeeStats, TeamStats } from "@/types";
import { 
  calculateEmployeeStats, 
  calculateTeamStats, 
  getEarliestCheckIn, 
  getLatestCheckOut,
  getLiveActivity
} from "@/lib/mock-data";
import { PunctualityLeaderboard } from "@/components/PunctualityLeaderboard";
import { ConsistencyLeaderboard } from "@/components/ConsistencyLeaderboard";
import { TeamLeaderboard } from "@/components/TeamLeaderboard";
import { BadgeDisplay } from "@/components/BadgeDisplay";
import { LiveActivityFeed } from "@/components/LiveActivityFeed";
import { Clock, Users, Timer, Award } from "lucide-react";

const Dashboard = () => {
  const [employeeStats, setEmployeeStats] = useState<EmployeeStats[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStats[]>([]);
  const [earliestCheckIn, setEarliestCheckIn] = useState<{ employee: any, time: Date } | null>(null);
  const [latestCheckOut, setLatestCheckOut] = useState<{ employee: any, time: Date } | null>(null);
  const [liveActivity, setLiveActivity] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentUser] = useState(() => {
    const stats = calculateEmployeeStats();
    return stats[Math.floor(Math.random() * stats.length)];
  });

  // Update data every minute
  useEffect(() => {
    const updateData = () => {
      setEmployeeStats(calculateEmployeeStats());
      setTeamStats(calculateTeamStats());
      setEarliestCheckIn(getEarliestCheckIn());
      setLatestCheckOut(getLatestCheckOut());
      setLiveActivity(getLiveActivity());
      setCurrentTime(new Date());
    };

    updateData();
    const interval = setInterval(updateData, 60000);
    return () => clearInterval(interval);
  }, []);

  // Format time function
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Time Titan Dashboard</h1>
          <div className="text-right">
            <p className="text-sm text-gray-500">Current Time</p>
            <p className="text-xl font-semibold">{formatTime(currentTime)}</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Personal Stats Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Your Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Clock className="mr-2 h-5 w-5" />
                  Work Progress
                </CardTitle>
                <CardDescription>9-hour shift</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Progress value={(9 * 60 - currentUser.minutesLeftToday) / (9 * 60) * 100} className="h-2" />
                  <div className="flex justify-between text-sm">
                    <span>{currentUser.hoursWorkedToday.toFixed(1)} hours worked</span>
                    <span>{Math.floor(currentUser.minutesLeftToday / 60)}h {currentUser.minutesLeftToday % 60}m left</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Award className="mr-2 h-5 w-5" />
                  Punctuality Score
                </CardTitle>
                <CardDescription>Based on your on-time arrivals</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{currentUser.punctualityScore}%</div>
                <div className="text-sm text-gray-500 mt-1">
                  {currentUser.punctualityScore > 90 
                    ? "Excellent! Keep it up!" 
                    : currentUser.punctualityScore > 70 
                      ? "Good standing" 
                      : "Needs improvement"}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Timer className="mr-2 h-5 w-5" />
                  Consistency Streak
                </CardTitle>
                <CardDescription>Days on time in a row</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline">
                  <span className="text-3xl font-bold">{currentUser.consistencyStreak.count}</span>
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

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  Status
                </CardTitle>
                <CardDescription>Your current status</CardDescription>
              </CardHeader>
              <CardContent>
                <Badge className={`
                  ${currentUser.isOnline 
                    ? "bg-green-100 text-green-800 hover:bg-green-100" 
                    : "bg-gray-100 text-gray-800 hover:bg-gray-100"}
                `}>
                  {currentUser.isOnline ? "At Work" : "Not Checked In"}
                </Badge>
                <div className="mt-4">
                  <BadgeDisplay badges={currentUser.badges} />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Highlights Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Today's Highlights</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Earliest Check-in</CardTitle>
                <CardDescription>First in the office today</CardDescription>
              </CardHeader>
              <CardContent>
                {earliestCheckIn ? (
                  <div className="flex items-center">
                    <div className="relative h-10 w-10 rounded-full overflow-hidden mr-3 bg-gray-200">
                      {earliestCheckIn.employee.profileImage && (
                        <img 
                          src={earliestCheckIn.employee.profileImage} 
                          alt={earliestCheckIn.employee.name}
                          className="object-cover" 
                        />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold">{earliestCheckIn.employee.name}</div>
                      <div className="text-sm text-gray-500">{formatTime(earliestCheckIn.time)}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500 italic">No check-ins yet today</div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Latest Check-out</CardTitle>
                <CardDescription>Last to leave yesterday</CardDescription>
              </CardHeader>
              <CardContent>
                {latestCheckOut ? (
                  <div className="flex items-center">
                    <div className="relative h-10 w-10 rounded-full overflow-hidden mr-3 bg-gray-200">
                      {latestCheckOut.employee.profileImage && (
                        <img 
                          src={latestCheckOut.employee.profileImage} 
                          alt={latestCheckOut.employee.name} 
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold">{latestCheckOut.employee.name}</div>
                      <div className="text-sm text-gray-500">{formatTime(latestCheckOut.time)}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500 italic">No data available</div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Currently Online</CardTitle>
                <CardDescription>Employees at work right now</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {employeeStats.filter(stat => stat.isOnline).length}
                  <span className="text-base text-gray-500 ml-2">/ {employeeStats.length}</span>
                </div>
                <div className="mt-2">
                  <LiveActivityFeed activity={liveActivity} />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Leaderboards Section */}
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
