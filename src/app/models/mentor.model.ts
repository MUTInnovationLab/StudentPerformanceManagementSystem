export interface Mentor {
    id: string;
    mentorID: string;
    name: string;
    surname: string;
    email: string;
    faculty: string;
    department: string;
    stream?: string;
    currentStudents?: number; // Add this line
    modules: string[];
}