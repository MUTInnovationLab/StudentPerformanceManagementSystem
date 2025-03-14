export interface StudentModuleAttendance {
  moduleCode: string;
  moduleName: string;
  totalSessions: number;  // scannerOpenCount
  attendedSessions: number;
  attendancePercentage: number;
  lastAttendance?: string;
  attendanceDates: string[];
}

export interface StudentAttendanceReport {
  studentNumber: string;
  modules: StudentModuleAttendance[];
  overallAttendance: number;
}
