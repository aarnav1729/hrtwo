
import { Employee, TimeRecord, EmployeeStats, TeamStats, Badge } from "@/types";

export const employees: Employee[] = [
  { id: "1", name: "John Doe", department: "Engineering", role: "Frontend Developer", profileImage: "https://randomuser.me/api/portraits/men/1.jpg" },
  { id: "2", name: "Jane Smith", department: "Engineering", role: "Backend Developer", profileImage: "https://randomuser.me/api/portraits/women/2.jpg" },
  { id: "3", name: "Robert Johnson", department: "Design", role: "UI Designer", profileImage: "https://randomuser.me/api/portraits/men/3.jpg" },
  { id: "4", name: "Sarah Williams", department: "Marketing", role: "Marketing Specialist", profileImage: "https://randomuser.me/api/portraits/women/4.jpg" },
  { id: "5", name: "Michael Brown", department: "Finance", role: "Financial Analyst", profileImage: "https://randomuser.me/api/portraits/men/5.jpg" },
  { id: "6", name: "Emily Davis", department: "HR", role: "HR Manager", profileImage: "https://randomuser.me/api/portraits/women/6.jpg" },
  { id: "7", name: "David Wilson", department: "Engineering", role: "DevOps Engineer", profileImage: "https://randomuser.me/api/portraits/men/7.jpg" },
  { id: "8", name: "Lisa Moore", department: "Design", role: "Graphic Designer", profileImage: "https://randomuser.me/api/portraits/women/8.jpg" },
];

const now = new Date();
const shiftHours = 9;

// Generate random time records
export const generateTimeRecords = (): TimeRecord[] => {
  const records: TimeRecord[] = [];
  
  employees.forEach(employee => {
    // Today's check-in record
    const baseCheckIn = new Date(now);
    baseCheckIn.setHours(8 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0, 0);
    
    const isOnline = Math.random() > 0.3;
    
    records.push({
      id: `today-${employee.id}`,
      employeeId: employee.id,
      checkIn: baseCheckIn,
      checkOut: isOnline ? undefined : new Date(baseCheckIn.getTime() + (Math.random() * 8 + 1) * 3600000),
      isOnTime: baseCheckIn.getHours() < 9 || (baseCheckIn.getHours() === 9 && baseCheckIn.getMinutes() === 0),
    });
    
    // Past records for the last 30 days
    for (let i = 1; i <= 30; i++) {
      const pastDate = new Date(now);
      pastDate.setDate(pastDate.getDate() - i);
      
      if (Math.random() > 0.1) { // 90% attendance rate
        const checkIn = new Date(pastDate);
        checkIn.setHours(8 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0, 0);
        
        const checkOutTime = new Date(checkIn);
        checkOutTime.setHours(checkIn.getHours() + 8 + Math.floor(Math.random() * 3), checkIn.getMinutes() + Math.floor(Math.random() * 60), 0, 0);
        
        records.push({
          id: `past-${i}-${employee.id}`,
          employeeId: employee.id,
          checkIn: checkIn,
          checkOut: checkOutTime,
          isOnTime: checkIn.getHours() < 9 || (checkIn.getHours() === 9 && checkIn.getMinutes() === 0),
        });
      }
    }
  });
  
  return records;
};

export const timeRecords = generateTimeRecords();

// Helper function to calculate employee stats
export const calculateEmployeeStats = (): EmployeeStats[] => {
  return employees.map(employee => {
    const employeeRecords = timeRecords.filter(record => record.employeeId === employee.id);
    const todayRecord = employeeRecords.find(record => {
      const recordDate = new Date(record.checkIn);
      return recordDate.toDateString() === now.toDateString();
    });
    
    // Calculate punctuality score (percentage of on-time check-ins)
    const totalRecords = employeeRecords.length;
    const onTimeRecords = employeeRecords.filter(record => record.isOnTime).length;
    const punctualityScore = totalRecords > 0 ? Math.round((onTimeRecords / totalRecords) * 100) : 0;
    
    // Calculate consistency streak
    let streakCount = 0;
    let isActive = true;
    
    // Sort records by date in descending order
    const sortedRecords = [...employeeRecords].sort((a, b) => new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime());
    
    for (let i = 0; i < sortedRecords.length; i++) {
      const currentDate = new Date(sortedRecords[i].checkIn);
      if (i === 0 && currentDate.toDateString() !== now.toDateString()) {
        isActive = false;
      }
      
      if (i > 0) {
        const prevDate = new Date(sortedRecords[i-1].checkIn);
        prevDate.setDate(prevDate.getDate() - 1);
        
        if (currentDate.toDateString() !== prevDate.toDateString() || !sortedRecords[i].isOnTime) {
          break;
        }
      }
      
      if (sortedRecords[i].isOnTime) {
        streakCount++;
      } else {
        break;
      }
    }
    
    // Calculate hours worked today and minutes left
    let hoursWorkedToday = 0;
    let minutesLeftToday = shiftHours * 60;
    
    if (todayRecord) {
      const checkIn = new Date(todayRecord.checkIn);
      const checkOut = todayRecord.checkOut ? new Date(todayRecord.checkOut) : new Date();
      const workedMilliseconds = checkOut.getTime() - checkIn.getTime();
      hoursWorkedToday = parseFloat((workedMilliseconds / (1000 * 60 * 60)).toFixed(2));
      
      const workedMinutes = Math.floor(workedMilliseconds / (1000 * 60));
      minutesLeftToday = Math.max(0, shiftHours * 60 - workedMinutes);
    }
    
    // Determine badges
    const badges: Badge[] = [];
    
    if (punctualityScore >= 95) {
      badges.push({
        type: "timeMaster",
        name: "Time Master",
        description: "Consistently on time for an entire month",
        icon: "🏆",
        earnedOn: new Date(),
      });
    }
    
    if (streakCount >= 5) {
      badges.push({
        type: "earlyBird",
        name: "Early Bird",
        description: "Consistently checks in before 9 AM",
        icon: "🐦",
        earnedOn: new Date(),
      });
    }
    
    const lateCheckouts = employeeRecords.filter(record => {
      if (record.checkOut) {
        const checkOutTime = new Date(record.checkOut);
        return checkOutTime.getHours() >= 18;
      }
      return false;
    }).length;
    
    if (lateCheckouts >= 10) {
      badges.push({
        type: "nightOwl",
        name: "Night Owl",
        description: "Stays late and checks out last consistently",
        icon: "🦉",
        earnedOn: new Date(),
      });
    }
    
    return {
      employee,
      punctualityScore,
      consistencyStreak: { count: streakCount, isActive },
      hoursWorkedToday,
      minutesLeftToday,
      isOnline: todayRecord ? !todayRecord.checkOut : false,
      badges,
    };
  });
};

export const employeeStats = calculateEmployeeStats();

// Calculate team stats
export const calculateTeamStats = (): TeamStats[] => {
  const teams = [...new Set(employees.map(e => e.department))];
  
  return teams.map(team => {
    const teamMembers = employees.filter(e => e.department === team);
    const teamMemberStats = employeeStats.filter(stats => 
      teamMembers.some(member => member.id === stats.employee.id)
    );
    
    const onlineCount = teamMemberStats.filter(stats => stats.isOnline).length;
    const averagePunctuality = teamMemberStats.reduce((sum, stats) => sum + stats.punctualityScore, 0) / teamMemberStats.length;
    
    return {
      teamName: team,
      averagePunctuality: Math.round(averagePunctuality),
      membersCount: teamMembers.length,
      onlineCount,
    };
  });
};

export const teamStats = calculateTeamStats();

// Get earliest check-in and latest check-out
export const getEarliestCheckIn = (): { employee: Employee, time: Date } | null => {
  const todayRecords = timeRecords.filter(record => {
    const recordDate = new Date(record.checkIn);
    return recordDate.toDateString() === now.toDateString();
  });
  
  if (todayRecords.length === 0) return null;
  
  const earliestRecord = todayRecords.reduce((earliest, current) => {
    return new Date(current.checkIn) < new Date(earliest.checkIn) ? current : earliest;
  });
  
  const employee = employees.find(e => e.id === earliestRecord.employeeId);
  return employee ? { employee, time: new Date(earliestRecord.checkIn) } : null;
};

export const getLatestCheckOut = (): { employee: Employee, time: Date } | null => {
  const yesterdayRecords = timeRecords.filter(record => {
    if (!record.checkOut) return false;
    
    const recordDate = new Date(record.checkOut);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return recordDate.toDateString() === yesterday.toDateString();
  });
  
  if (yesterdayRecords.length === 0) return null;
  
  const latestRecord = yesterdayRecords.reduce((latest, current) => {
    return current.checkOut && latest.checkOut && 
           new Date(current.checkOut) > new Date(latest.checkOut) ? current : latest;
  });
  
  const employee = employees.find(e => e.id === latestRecord.employeeId);
  return employee && latestRecord.checkOut ? { employee, time: new Date(latestRecord.checkOut) } : null;
};

// Get employees checking in/out right now (simulated)
export const getLiveActivity = (): { action: 'check-in' | 'check-out', employee: Employee, time: Date }[] => {
  // Simulate 1-3 employees currently checking in or out
  const count = Math.floor(Math.random() * 3) + 1;
  const activity = [];
  
  for (let i = 0; i < count; i++) {
    const randomEmployee = employees[Math.floor(Math.random() * employees.length)];
    const action = Math.random() > 0.5 ? 'check-in' : 'check-out';
    
    activity.push({
      action,
      employee: randomEmployee,
      time: new Date()
    });
  }
  
  return activity;
};
