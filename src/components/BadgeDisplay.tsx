
import { Badge as BadgeType } from "@/types";
import { Tooltip } from "@/components/ui/tooltip";
import { TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface BadgeDisplayProps {
  badges: BadgeType[];
}

export const BadgeDisplay = ({ badges }: BadgeDisplayProps) => {
  if (badges.length === 0) {
    return <div className="text-sm text-gray-500">No badges earned yet</div>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <TooltipProvider>
        {badges.map((badge) => (
          <Tooltip key={badge.type}>
            <TooltipTrigger asChild>
              <div className="text-2xl cursor-help">{badge.icon}</div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <div className="text-sm">
                <div className="font-bold">{badge.name}</div>
                <div>{badge.description}</div>
                {badge.earnedOn && (
                  <div className="text-xs mt-1 text-gray-400">
                    Earned on {badge.earnedOn.toLocaleDateString()}
                  </div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
    </div>
  );
};
