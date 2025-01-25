export interface Student {
    id: number;
    name: string;
    course: string;
    department: string;
    studentNumber: string;
    faculty: string;
    enrollmentDate: string;
  }
  
  export type AttendanceType = 'excellent' | 'good' | 'fair' | 'poor';
  
  export interface Feedback {
    id?: string; // Firestore uses string IDs
    studentId: number;
    date: string;
    technicalProgress: string;
    softSkills: string;
    attendance: AttendanceType;
    completedTasks: string;
    areasForImprovement: string;
    supportNeeded: string;
    recommendations: string;
  }
  