export interface Marks {
    moduleCode: string;  // The module code, e.g., 'ICT101'
    testPercentages: TestPercentages;  // A map of test names to their respective percentages
    marks: StudentMarks[];  // An array of student marks data
  }
  
  export interface TestPercentages {
    test1: number;  // Percentage of test 1
    test2: number;  // Percentage of test 2
    test3: number;  // Percentage of test 3
    test4: number;  // Percentage of test 4
    test5: number;  // Percentage of test 5
    test6: number;  // Percentage of test 6
    test7: number;  // Percentage of test 7
  }
  
  export interface StudentMarks {
    studentNumber: string;  // The student's number
    test1: number | string;  // Marks for test 1 (number or string if not entered)
    test2: number | string;  // Marks for test 2
    test3: number | string;  // Marks for test 3
    test4: number | string;  // Marks for test 4
    test5: number | string;  // Marks for test 5
    test6: number | string;  // Marks for test 6
    test7: number | string;  // Marks for test 7
    average?: string;  // Optional average field, only calculated if required
  }
  