
import { Employee } from "@/types";
import { Check, LogOut } from "lucide-react";

interface LiveActivityProps {
  activity: { 
    action: 'check-in' | 'check-out';
    employee: Employee;
    time: Date;
  }[];
}

export const LiveActivityFeed = ({ activity }: LiveActivityProps) => {
  if (activity.length === 0) {
    return <div className="text-sm text-gray-500">No recent activity</div>;
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-2 animate-fade-in">
      {activity.map((item, index) => (
        <div key={index} className="flex items-center text-sm">
          <div className="mr-2">
            {item.action === 'check-in' ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <LogOut className="h-4 w-4 text-amber-500" />
            )}
          </div>
          <div className="font-medium">{item.employee.name}</div>
          <div className="ml-1 text-gray-500">
            just {item.action === 'check-in' ? 'arrived' : 'left'} • {formatTime(item.time)}
          </div>
        </div>
      ))}
    </div>
  );
};
