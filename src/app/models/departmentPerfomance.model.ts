export interface DepartmentPerformance {
    name: string;
    academicPerformanceRate: number;
    academicPerformanceLevel: 'High' | 'Medium' | 'Low';
    attendancePerformanceRate: number;
    attendancePerformanceLevel: 'High' | 'Medium' | 'Low';
    totalStudents: number;
    averageMarks: number;
    averageAttendance: number;
    modules: {
      moduleCode: string;
      moduleName: string;
      averageMarks: number;
      averageAttendance: number;
      totalStudents: number;
      totalAttendanceDays?: number;
      totalAttendedStudents?: number;
    }[];
  }
  
   export interface ModuleAcademicPerformance {
    moduleCode: string;
    moduleName: string;
    averageMarks: number;
    totalStudents: number;
  }

  
  