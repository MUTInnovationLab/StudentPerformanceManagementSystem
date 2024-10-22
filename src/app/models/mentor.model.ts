export interface Mentor {
    mentorID: string;
    name: string;
    surname: string;
    email: string;
    faculty: string;
    department: string;
    stream?: string;
    modules: string[];
}