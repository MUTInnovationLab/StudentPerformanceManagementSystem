export interface AttendanceRecord {
    studentNumber: string;
    scanTime: string;
  }
  
  export interface DailyAttendance {
    [date: string]: AttendanceRecord[];
  }
  
  export interface ModuleAttendancePerformance {
    moduleCode: string;
    moduleName: string;
    averageAttendance: number;
    totalStudents: number;
    totalAttendanceDays: number;
    totalAttendedStudents: number;
  }
  