export interface Marks {
  date: string; // Date of the marks
  studentNumber: number; // Student number as a string
  average: string; // Average marks as a string
  test1: number | string; // Test 1 marks
  test2: number | string; // Test 2 marks
  test3: number | string; // Test 3 marks
  test4: number | string; // Test 4 marks
  test5: number | string; // Test 5 marks
  test6: number | string; // Test 6 marks
  test7: number | string; // Test 7 marks
  moduleCode?: string; // Optional module code
  testPercentages?: { [key: string]: number }; // Optional test percentages
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
  