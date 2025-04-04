
export interface Employee {
  id: string;
  name: string;
  department: string;
  profileImage?: string;
  role: string;
}

export interface TimeRecord {
  id: string;
  employeeId: string;
  checkIn: Date;
  checkOut?: Date;
  isOnTime: boolean;
}

export interface Streak {
  count: number;
  isActive: boolean;
}

export interface EmployeeStats {
  employee: Employee;
  punctualityScore: number;
  consistencyStreak: Streak;
  hoursWorkedToday: number;
  minutesLeftToday: number;
  isOnline: boolean;
  badges: Badge[];
}

export interface TeamStats {
  teamName: string;
  averagePunctuality: number;
  membersCount: number;
  onlineCount: number;
}

export type BadgeType = "timeMaster" | "earlyBird" | "nightOwl";

export interface Badge {
  type: BadgeType;
  name: string;
  description: string;
  icon: string;
  earnedOn?: Date;
}
