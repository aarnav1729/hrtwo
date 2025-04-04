
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TeamStats } from "@/types";

interface TeamLeaderboardProps {
  teams: TeamStats[];
}

export const TeamLeaderboard = ({ teams }: TeamLeaderboardProps) => {
  // Sort by average punctuality (highest first)
  const sortedTeams = [...teams].sort((a, b) => b.averagePunctuality - a.averagePunctuality);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Team Leaderboard</span>
          <span className="text-sm font-normal">👥</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {sortedTeams.map((team, index) => (
            <div key={team.teamName} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold flex items-center">
                    <span className="w-6 text-center font-bold text-gray-500 mr-2">#{index + 1}</span>
                    {team.teamName}
                  </div>
                  <div className="text-sm text-gray-500">
                    {team.onlineCount} of {team.membersCount} online
                  </div>
                </div>
                <div className="text-lg font-bold">{team.averagePunctuality}%</div>
              </div>
              <Progress 
                value={team.averagePunctuality} 
                className="h-2"
              />
            </div>
          ))}
          
          {sortedTeams.length === 0 && (
            <div className="text-center py-6 text-gray-500">
              No data available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
