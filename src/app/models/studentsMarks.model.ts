export interface StudentMarks {
  studentNumber: string;
  test1: number | null | undefined;
  test2: number | null | undefined;
  test3: number | null | undefined;
  test4: number | null | undefined;
  test5: number | null | undefined;
  test6: number | null | undefined;
  test7: number | null | undefined;
  average: number;
  moduleCode: string; // Change from optional to required
  riskCategory?: RiskCategory;
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

export enum RiskCategory {
  AT_RISK = 'At Risk',
  PARTIALLY_AT_RISK = 'Partially At Risk',
  INTERMEDIATE = 'Intermediate',
  DISTINCTION = 'Distinction'
}