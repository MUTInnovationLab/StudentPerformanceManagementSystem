export interface Student {
    id: number;  
    studentNumber: string; // Ensure it's a string
    name: string;
    surname: string;
    email: string;
    course: string;
    year: string;
    faculty: string;
    department: string;
    enrollmentDate: string;
    scanTime?: string | null; // Add scanTime property
    [key: string]: any;
  }
  