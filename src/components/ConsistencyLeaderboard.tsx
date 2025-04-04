
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmployeeStats } from "@/types";

interface ConsistencyLeaderboardProps {
  stats: EmployeeStats[];
}

export const ConsistencyLeaderboard = ({ stats }: ConsistencyLeaderboardProps) => {
  // Sort by consistency streak (highest first)
  const sortedStats = [...stats]
    .sort((a, b) => b.consistencyStreak.count - a.consistencyStreak.count)
    .slice(0, 5);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Consistency Streaks</span>
          <span className="text-sm font-normal">🔥</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedStats.map((stat, index) => (
            <div key={stat.employee.id} className="flex items-center">
              <div className="w-6 text-center font-bold text-gray-500">#{index + 1}</div>
              <div className="relative h-10 w-10 rounded-full overflow-hidden mx-3 bg-gray-200">
                {stat.employee.profileImage && (
                  <img 
                    src={stat.employee.profileImage} 
                    alt={stat.employee.name} 
                    className="object-cover" 
                  />
                )}
              </div>
              <div className="flex-1">
                <div className="font-semibold">{stat.employee.name}</div>
                <div className="text-sm text-gray-500">{stat.employee.department}</div>
              </div>
              <div className="flex items-center">
                <span className="text-lg font-bold mr-2">{stat.consistencyStreak.count}</span>
                <span className="text-xl" aria-hidden="true">
                  {stat.consistencyStreak.count > 0 && "🔥"}
                </span>
              </div>
            </div>
          ))}
          
          {sortedStats.length === 0 && (
            <div className="text-center py-6 text-gray-500">
              No data available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
