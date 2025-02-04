export interface StudentMarks {
  studentNumber: string;
  test1?: number | null;
  test2?: number | null;
  test3?: number | null;
  test4?: number | null;
  test5?: number | null;
  test6?: number | null;
  test7?: number | null;
  average: number;
  scanTime?: string | null; // Add scanTime property
  [key: string]: any; // Index signature to allow string indexing
}

export interface TestPercentages {
  test1: number;
  test2: number;
  test3: number;
  test4: number;
  test5: number;
  test6: number;
  test7: number;
}

export interface DetailedStudentInfo {
  studentNumber: string;
  name: string;
  surname: string;
  department: string;
  email: string;
  moduleName: string;
  moduleCode: string;
  average: number;
  marks: {
    studentNumber: string;
    average: number;
    test1: number;
    test2: number;
    test3: number;
    test4: number;
    test5: number;
    test6: number;
    test7: number;
    moduleCode: string;
    scanTime: string | null;
    [key: string]: any; // Index signature to allow string indexing
  };
  attendance?: { [module: string]: string }; // Add this property
}

export interface ModuleMarksDocument {
  moduleCode: string;
  marks: StudentMarks[];
  testPercentages: TestPercentages;
}