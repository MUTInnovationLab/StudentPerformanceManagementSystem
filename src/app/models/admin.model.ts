interface BaseItem {
    id: string;
    name: string;
    email: string;
    position?: string;
    collection?: string; // Added to track which collection the item belongs to
    [key: string]: any;
  }
  
  interface UpdatedData {
    id?: string;
    collection?: string;
    [key: string]: any;
  }
  // Add these interfaces to your existing interfaces
  interface Module {
    moduleCode: string;
    moduleLevel: string;
    moduleName: string;
    department?: string;
  }
  
  interface FacultyModule {
    modules: Module[];
  }
  
  interface ModuleDetail {
    name: string;
    code: string;
    department: string;
    level: string;
  }
  
  interface Stat {
    title: string;
    count: number;
    details?: ModuleDetail[];
  }
  
  interface FacultyDocument {
    name: string;
    modules: Module[];
    departments?: Department[];
  }
  interface FacultyStat {
    id: string;
    name: string;
    departmentsCount: number;
    modulesCount: number;
  }
  
  interface HOD {
    name: string;
    fullName: string;
    email: string;
    department: string;
    phone: string;
  }
  interface Department {
    name: string;
    modules?: Module[];
      streams?: string[];  // Add the streams property
  
  }
  
  interface Faculty {
    departments: Department[];
    modules: Module[];
  }
  interface StudentMark {
    average: string;
    studentNumber: number;
    test1?: number;
    test2?: number;
    test3?: number;
    test4?: number;
    test5?: number;
    test6?: string;
    test7?: string;
  }
  interface MarksDocument {
    marks: StudentMark[];
    moduleCode?: string;
    testPercentages?: {
      test1: number;
      test2: number;
      test3: number;
      test4: number;
      test5: number;
      test6: number;
      test7: number;
    };
  }
  
  interface StatCard {
    title: string;
    count: number;
    icon: string;
    color: string;
    details?: any[];
  }
  interface DetailItem {
    id?: string;
    name?: string;
    email?: string;
    department?: string;
    position?: string;
    courses?: string[];
    studentNumber?: number;
    average?: number;
    [key: string]: any; // For other dynamic properties
  }
  
  
  // Interface for Performance Data
  interface PerformanceData {
    month: string;
    students: number;
    assignments: number;
    attendance: number;
  }