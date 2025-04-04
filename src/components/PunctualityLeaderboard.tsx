
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmployeeStats } from "@/types";

interface PunctualityLeaderboardProps {
  stats: EmployeeStats[];
}

export const PunctualityLeaderboard = ({ stats }: PunctualityLeaderboardProps) => {
  // Sort by punctuality score (highest first)
  const sortedStats = [...stats].sort((a, b) => b.punctualityScore - a.punctualityScore).slice(0, 5);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Punctuality Leaderboard</span>
          <span className="text-sm font-normal">🏆</span>
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
              <div className="text-lg font-bold">{stat.punctualityScore}%</div>
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
