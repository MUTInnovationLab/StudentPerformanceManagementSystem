
export interface ModuleRange {
    range: string;
    modules: Array<{
      code: string;
      average: number;
    }>;
  }
  export interface Module {
    moduleName: string;
    moduleCode: string;
    moduleLevel: string;
  }
  interface Department {
    name: string;
    streams?: StreamMap;
    modules?: Module[];
  }
  export interface Faculty {
    id: string;
    departments: Department[];
  }
  export interface User {
    department: string;
    faculty: string;
    fullName: string;
    email: string;
    position: string;
    staffNumber: string;
  }
  export interface Stream {
    modules: Module[];
    name: string;
  }
  export  interface StreamMap {
    [key: string]: Stream[];
  }

  export interface Student {
    name: string;
    surname: string;
    email: string;
    studentNumber: string;
  }
  
  export  interface ModuleMarks {
    [studentNumber: string]: number; 
  }
  export interface AssignedLectures {
    modules: { moduleCode: string }[]; 
  }
  
 export interface StudentMark {
    studentNumber: string;
    average: number;
  }
  
  // Interface for the marks document
  export interface MarksData {
    marks: StudentMark[];
  }
  
