export interface Module {
    department: string;
    faculty: string;
    moduleCode: string;
    moduleLevel: string;
    moduleName: string;
    scannerOpenCount: number;
    userEmail: string;
  }
  export interface AssignedLectures {
    modules: Module[];
  }
    