export interface AttendanceRecord {
  studentNumber: string;
  scanTime: string;
}

export interface DailyAttendance {
  [date: string]: AttendanceRecord[];
}

export interface ModuleAttendance {
  moduleName: string;  // This is the moduleCode
  dates: DailyAttendance;
}
