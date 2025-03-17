import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AuthenticationService } from '../services/auths.service';
import { AcademicService } from '../services/academic.service';
import { AttendanceService } from '../services/attendance.service';
import { Router } from '@angular/router';
import { ModuleMarksDocument, DetailedStudentInfo } from '../models/studentsMarks.model';
import { Faculty, Department, Module } from '../models/faculty.model';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-students-performance',
  templateUrl: './students-performance.page.html',
  styleUrls: ['./students-performance.page.scss','./students-performance1.page.scss'],
})
export class StudentsPerformancePage implements OnInit {

  numberOfTests: number = 4; // Define the number of tests
  testCount: number[] = Array.from({ length: this.numberOfTests }, (_, i) => i + 1); 

  menuVisible: boolean = false;
  students: DetailedStudentInfo[] = [];
  studentsNeedingAttention: DetailedStudentInfo[] = [];
  error: string | null = null;
  errorMessage: string | null = null;
  testOutOf: number[] = Array(7).fill(null); 
  isLoading: boolean = true; // Add loading state
  studentsAttendance: { [studentNumber: string]: any } = {}; // Add this property to store attendance data

  constructor(
    private router: Router,
    private firestore: AngularFirestore,
    private authService: AuthenticationService,
    private academicService: AcademicService,
    private attendanceService: AttendanceService // Inject AttendanceService
  ) {}

  ngOnInit() {
    this.loadData();
  }

  private async loadData() {
    this.isLoading = true;
    try {
      await this.loadStudentMarks();
      const moduleCodes = this.students.map(student => student.marks.moduleCode);
      await this.loadAttendanceData(moduleCodes);
      await this.loadStudentMarks();
      await this.retrieveStudentMarks(moduleCodes);
      await this.retrieveAllStudentsMarks();
      this.studentsNeedingAttention = this.getStudentsNeedingAttention(this.students, this.testOutOf); // Update studentsNeedingAttention
      // await this.calculateStudentsAttendance(moduleCodes); // Calculate attendance percentage
      // await this.testOutOf = await this.academicService.getTestOutOf(); // Fetch testOutOf from academic service

    } catch (error) {
      console.error('Error loading data:', error);
      this.error = 'Failed to load data';
    } finally {
      this.isLoading = false;
    }
  }

  openMenu() {
    this.menuVisible = !this.menuVisible;
  }
  dashboard(){
    this.router.navigate(['/dashboard']);
    this.menuVisible = false;
  }
  supportFeedback(){
    this.router.navigate(['/support-feedback']);
    this.menuVisible = false
  }
  strugglingStudents(){
    this.router.navigate(['/struggling-students']);
    this.menuVisible = false;
  }

  goToMeeting() {
    this.router.navigate(['/meeting']);
  }

  goToCsv() {
    this.router.navigate(['/csv']);
  }

  goToStudentsManagement() {
    this.router.navigate(['/students-management']);
  }
  mentorStudents(){
    this.router.navigate(['/mentor-students']);
    this.menuVisible = false;
  }

  logout() {
    this.authService.signOut().then(() => {
      this.router.navigate(['/login']);
    });
  }

  private async loadAttendanceData(moduleCodes: string[]): Promise<void> {
    try {
      const attendancePromises = moduleCodes.map(async (moduleCode) => {
        const attendanceQuery = await this.firestore
          .collection('Attended')
          .ref.where('moduleCode', '==', moduleCode)
          .get();
  
        if (!attendanceQuery || attendanceQuery.empty) {
          console.warn(`No attendance data found for module: ${moduleCode}`);
          return;
        }
  
        attendanceQuery.docs.forEach((doc) => {
          const data = doc.data() as { studentNumber: string };
          if (data && data.studentNumber) {
            if (!this.studentsAttendance[data.studentNumber]) {
              this.studentsAttendance[data.studentNumber] = {};
            }
            this.studentsAttendance[data.studentNumber][moduleCode] = data;
          }
        });
      });
  
      await Promise.all(attendancePromises);
      console.log('Attendance data loaded:', this.studentsAttendance); // Debug log
    } catch (error) {
      console.error('Error loading attendance data:', error);
      throw error;
    }
  }
  
  private async loadStudentMarks() {
    this.isLoading = true; // Set loading state to true
    try {
      const user = await this.authService.getLoggedInStaff();
      if (!user || !user.email || !user.staffNumber) {
        this.error = 'User not authenticated';
        return;
      }
  
      console.log('Logged in user:', user);
  
      const staffSnapshot = await this.firestore.collection('staff')
        .ref.where('email', '==', user.email)
        .get();
  
      if (staffSnapshot.empty) {
        this.error = 'User not found in staff collection';
        return;
      }
  
      const staffData = staffSnapshot.docs[0].data() as { position: string };
      console.log('User found in staff collection:', staffData);
  
      if (staffData.position === 'HOD') {
        // If the staff member is an HOD, retrieve all students' details
        this.students = await this.retrieveAllStudentsMarks();
      } else {
        const assignedLecturesDoc = await this.firestore.collection('assignedLectures')
          .doc(user.staffNumber)
          .get()
          .toPromise();
  
        if (!assignedLecturesDoc || !assignedLecturesDoc.exists) {
          this.error = 'User not found in assignedLectures collection';
          console.log('Assigned lectures document not found for staffNumber:', user.staffNumber);
          return;
        }
  
        const assignedLecturesData = assignedLecturesDoc.data();
        console.log('User found in assignedLectures collection:', assignedLecturesData);
  
        const assignedModules = (assignedLecturesData as { modules: any[] })?.modules || [];
        const moduleCodes = assignedModules.map((module: { moduleCode: string }) => module.moduleCode);
  
        this.students = await this.retrieveStudentMarks(moduleCodes);
        await this.loadAttendanceData(moduleCodes); // Load attendance data
      }
  
      this.studentsNeedingAttention = this.getStudentsNeedingAttention(this.students, this.testOutOf);
      console.log('Students needing attention:', this.studentsNeedingAttention); // Debug log
    } catch (error) {
      if ((error as any).code === 'resource-exhausted') {
        this.error = 'Quota Exceeded: The Firestore quota has been exceeded. Please upload an Excel file with the student marks.';
      } else {
        console.error('Error loading student marks:', error);
        this.error = 'Failed to load student marks';
      }
    } finally {
      this.isLoading = false; // Set loading state to false
    }
  }
  
  private async retrieveStudentMarks(moduleCodes: string[]): Promise<DetailedStudentInfo[]> {
    const students: DetailedStudentInfo[] = [];
    try {
        const moduleChunks = this.chunkArray(moduleCodes, 10);
        for (const moduleChunk of moduleChunks) {
            let lastMarkDoc = null;
            let marksQuery;
            do {
                marksQuery = await this.firestore
                    .collection('marks')
                    .ref.where('moduleCode', 'in', moduleChunk)
                    .orderBy('moduleCode')
                    .startAfter(lastMarkDoc)
                    .limit(10)
                    .get();

                if (!marksQuery || marksQuery.empty) {
                    break;
                }

                const studentNumbers = new Set<string>();
                const moduleMarks = new Map<string, any>();

                marksQuery.docs.forEach(doc => {
                    const data = doc.data() as ModuleMarksDocument;
                    moduleMarks.set(doc.id, data);
                    if (data.marks) {
                        data.marks.forEach(mark => {
                            if (mark.studentNumber) {
                                studentNumbers.add(mark.studentNumber.toString());
                            }
                        });
                    }
                });

                const studentChunks = this.chunkArray(Array.from(studentNumbers), 10);
                const studentMap = new Map<string, any>();

                for (const studentChunk of studentChunks) {
                    let lastStudentDoc = null;
                    let studentsQuery;
                    do {
                        studentsQuery = await this.firestore
                            .collection('students')
                            .ref.where('studentNumber', 'in', studentChunk)
                            .orderBy('studentNumber')
                            .startAfter(lastStudentDoc)
                            .limit(10)
                            .get();

                        if (!studentsQuery || studentsQuery.empty) {
                            break;
                        }

                        studentsQuery.docs.forEach(doc => {
                            studentMap.set(doc.id, doc.data());
                        });

                        lastStudentDoc = studentsQuery.docs[studentsQuery.docs.length - 1];
                    } while (studentsQuery.docs.length === 10);
                }

                moduleMarks.forEach((moduleData, moduleCode) => {
                    const module = moduleCodes.find(m => m === moduleCode);
                    if (!module) return;

                    moduleData.marks.forEach((mark: any) => {
                        if (!mark.studentNumber) return;

                        const average = mark.average ? Number(mark.average) :
                            this.calculateStudentAverage(mark, moduleData.testPercentages);

                        const studentData = studentMap.get(mark.studentNumber.toString());

                        if (studentData) {
                            const marks: any = {
                                studentNumber: mark.studentNumber,
                                average: mark.average,
                                moduleCode: moduleCode,
                                scanTime: mark.scanTime ?? null // Ensure scanTime is included
                            };

                            // Dynamically add test marks
                            Object.keys(mark).forEach(key => {
                                if (key.startsWith('test')) {
                                    marks[key] = mark[key] ?? null;
                                }
                            });

                            const studentDetail: DetailedStudentInfo = {
                                studentNumber: mark.studentNumber,
                                name: studentData.name ?? 'N/A',
                                surname: studentData.surname ?? 'N/A',
                                email: studentData.email ?? 'N/A',
                                department: studentData.department ?? 'N/A',
                                average,
                                moduleName: moduleData.moduleName,
                                moduleCode: moduleCode,
                                marks: marks,
                                attendance: studentData.attendance ?? {}
                            };
                            students.push(studentDetail);
                        }
                    });
                });

                lastMarkDoc = marksQuery.docs[marksQuery.docs.length - 1];
            } while (marksQuery.docs.length === 10);
        }
        console.log('Retrieved students:', students); // Debug log
    } catch (error) {
        console.error('Error retrieving student marks:', error);
        throw error;
    }
    return students;
}
  
private async retrieveAllStudentsMarks(): Promise<DetailedStudentInfo[]> {
  const students: DetailedStudentInfo[] = [];
  try {
      let lastStudentDoc = null;
      let studentsQuery;
      const studentMap = new Map<string, any>();

      do {
          studentsQuery = await this.firestore.collection('students')
              .ref.orderBy('studentNumber')
              .startAfter(lastStudentDoc)
              .limit(10)
              .get();

          if (!studentsQuery || studentsQuery.empty) {
              break;
          }

          studentsQuery.docs.forEach(doc => {
              studentMap.set(doc.id, doc.data());
          });

          lastStudentDoc = studentsQuery.docs[studentsQuery.docs.length - 1];
      } while (studentsQuery.docs.length === 10);

      let lastMarkDoc = null;
      let marksQuery;
      const moduleMarks = new Map<string, any>();

      do {
          marksQuery = await this.firestore.collection('marks')
              .ref.orderBy('moduleCode')
              .startAfter(lastMarkDoc)
              .limit(10)
              .get();

          if (!marksQuery || marksQuery.empty) {
              break;
          }

          marksQuery.docs.forEach(doc => {
              const data = doc.data() as ModuleMarksDocument;
              moduleMarks.set(doc.id, data);
          });

          lastMarkDoc = marksQuery.docs[marksQuery.docs.length - 1];
      } while (marksQuery.docs.length === 10);

      moduleMarks.forEach((moduleData, moduleCode) => {
          moduleData.marks.forEach((mark: any) => {
              if (!mark.studentNumber) return;

              const average = mark.average ? Number(mark.average) :
                  this.calculateStudentAverage(mark, moduleData.testPercentages);

              const studentData = studentMap.get(mark.studentNumber.toString());

              if (studentData) {
                  const marks: any = {
                      studentNumber: mark.studentNumber,
                      average: mark.average,
                      moduleCode: moduleCode,
                      scanTime: mark.scanTime ?? null // Ensure scanTime is included
                  };

                  // Dynamically add test marks
                  Object.keys(mark).forEach(key => {
                      if (key.startsWith('test')) {
                          marks[key] = mark[key] ?? null;
                      }
                  });

                  const studentDetail: DetailedStudentInfo = {
                      studentNumber: mark.studentNumber,
                      name: studentData.name ?? 'N/A',
                      surname: studentData.surname ?? 'N/A',
                      email: studentData.email ?? 'N/A',
                      department: studentData.department ?? 'N/A',
                      average,
                      moduleName: moduleData.moduleName,
                      moduleCode: moduleCode,
                      marks: marks,
                      attendance: studentData.attendance ?? {}
                  };
                  students.push(studentDetail);
              }
          });
      });

      console.log('Retrieved all students:', students); // Debug log
  } catch (error) {
      console.error('Error retrieving all students marks:', error);
      throw error;
  }
  return students;
}

getAverage(student: any): number {
  let totalMarks = 0;
  let testCount = 0;

  // Loop through the marks and calculate the total
  for (let i = 0; i < this.testOutOf.length; i++) {
    const testMark = student.marks['test' + (i + 1)];
    if (testMark !== '') {
      totalMarks += +testMark; // Add mark to total
      testCount++; // Count number of tests with marks
    }
  }

  // Calculate the average if there are marks
  return testCount > 0 ? totalMarks / testCount : 0;
}

  
private getStudentsNeedingAttention(
  students: DetailedStudentInfo[],
  testOutOf: number[] // Array of test totals (e.g., [50, 100, 75, ...])
): DetailedStudentInfo[] {
  return students.filter(student => 
    testOutOf.some((outOf, index) => {
      // Dynamically get the test key for the student's score (e.g., "test1", "test2")
      const testKey = `test${index + 1}`;
      // Get the student's score for the current test
      const score = student.marks[testKey];
      
      // Return true if the score is less than or equal to 50% of the test's total
      return score !== null && score !== undefined && score <= (outOf * 0.5);
    })
  );
}



private chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

private calculateStudentAverage(mark: any, testPercentages: any): number {
  let totalWeightedScore = 0;
  let totalWeight = 0;

  Object.keys(testPercentages).forEach(testKey => {
    const score = Number(mark[testKey]);
    const weight = testPercentages[testKey];

    if (!isNaN(score) && score !== null && weight) {
      totalWeightedScore += (score * weight);
      totalWeight += weight;
    }
  });

  return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
}

getScoreColor(score: number | null | undefined, outOf: number | null | undefined): string {
  if (outOf === null || outOf === undefined || outOf === 0 || score === null || score === undefined) {
    return 'black'; // Default color if data is missing
  }
  const percentage = (score / outOf) * 100;
  if (percentage >= 75) {
    return 'green';
  } else if (percentage >= 50) {
    return 'orange';
  } else {
    return 'red';
  }
}

getScoreColorClass(score: number | null | undefined, outOf: number | null | undefined): string {
  if (outOf === null || outOf === undefined || outOf === 0 || score === null || score === undefined) {
    return 'no-data-bg'; // Default class if data is missing
  }
  const percentage = (score / outOf) * 100;
  if (percentage >= 75) {
    return 'good-performance-bg';
  } else if (percentage >= 50) {
    return 'moderate-performance-bg';
  } else {
    return 'poor-performance-bg';
  }
}

hasTestMarks(testIndex: number): boolean {
  return this.students.some(student => student.marks['test' + testIndex] !== '');
}


// hasTestMarks(testNumber: number): boolean {
//   return this.students.some(student => {
//     const testKey = `test${testNumber}`;
//     return student.marks[testKey] !== null && student.marks[testKey] !== undefined && student.marks[testKey] !== 0;
//   });
// }

 hasTestMarksForAttention(testIndex: number): boolean {
    return this.studentsNeedingAttention.some(student => student.marks['test' + testIndex] !== '');
  }

hasFailedMoreThanTwoTests(student: any): boolean {
  let failCount = 0;
  for (let i = 0; i < this.testOutOf.length; i++) {
    const testScore = student.marks['test' + (i + 1)];
    if (testScore !== null && testScore !== undefined && testScore < (this.testOutOf[i] * 0.5)) {
      failCount++;
    }
  }
  return failCount > 2;
}
  
  // handleFileInput(event: any) {
  //   const file = event.target.files[0];
  //   if (file) {
  //     const reader = new FileReader();
  //     reader.onload = (e: any) => {
  //       const data = new Uint8Array(e.target.result);
  //       const workbook = XLSX.read(data, { type: 'array' });
  //       const sheetName = workbook.SheetNames[0];
  //       const worksheet = workbook.Sheets[sheetName];
  //       const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  //       this.processExcelData(jsonData);
  //     };
  //     reader.readAsArrayBuffer(file);
  //   }
  // }
  
  // processExcelData(data: any[]) {
  //   const headers = data[0];
  //   const rows = data.slice(1);
  //   const uploadedStudents: DetailedStudentInfo[] = rows.map(row => {
  //     const student: any = {};
  //     headers.forEach((header: string, index: number) => {
  //       student[header] = row[index];
  //     });
  
  //     // Parse attendance data
  //     const attendanceEntries = student.attendance ? student.attendance.split('\n').map((entry: string) => entry.split(': ')) : [];
  //     const attendanceData: { [module: string]: string } = {};
  //     attendanceEntries.forEach(([module, time]: [string, string]) => {
  //       attendanceData[module] = time;
  //     });
  
  //     return {
  //       studentNumber: student.studentNumber,
  //       name: student.name,
  //       surname: student.surname,
  //       email: student.email,
  //       department: student.department,
  //       average: student.average,
  //       moduleName: student.moduleName,
  //       moduleCode: student.moduleCode, // Add moduleCode property
  //       marks: {
  //         studentNumber: student.studentNumber,
  //         average: student.average,
  //         test1: student.test1 ?? null,
  //         test2: student.test2 ?? null,
  //         test3: student.test3 ?? null,
  //         test4: student.test4 ?? null,
  //         test5: student.test5 ?? null,
  //         test6: student.test6 ?? null,
  //         test7: student.test7 ?? null,
  //         moduleCode: student.moduleCode, // Ensure moduleCode is included
  //         scanTime: student.scanTime ?? null // Ensure scanTime is included
  //       },
  //       attendance: attendanceData // Include parsed attendance data
  //     };
  //   });
  
  //   const filteredUploadedStudents = uploadedStudents.filter(student => {
  //     return this.students.some(existingStudent => existingStudent.studentNumber === student.studentNumber);
  //   });
  
  //   this.studentsNeedingAttention = this.getStudentsNeedingAttention(filteredUploadedStudents);
  // }
  
  // onFileChange(event: any) {
  //   this.handleFileInput(event);
  // }
  
  // downloadExcel() {
  //   try {
  //     const filteredStudents = this.students.map(student => {
  //       const filteredMarks = Object.keys(student.marks)
  //         .filter(key => student.marks[key] !== null && typeof student.marks[key] === 'number')
  //         .reduce((obj, key) => {
  //           obj[key] = student.marks[key];
  //           return obj;
  //         }, {} as any);
  
  //       const attendance = this.getObjectKeys(this.studentsAttendance[student.studentNumber])
  //         .map(module => `${module}: ${this.studentsAttendance[student.studentNumber][module]}`)
  //         .join('\n');
  
  //       return {
  //         studentNumber: student.studentNumber,
  //         name: student.name,
  //         surname: student.surname,
  //         email: student.email,
  //         department: student.department,
  //         moduleName: student.moduleName,
  //         average: student.average,
  //         attendance, // Include formatted attendance
  //         ...filteredMarks
  //       };
  //     });
  
  //     const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(filteredStudents);
  //     const workbook: XLSX.WorkBook = { Sheets: { 'data': worksheet }, SheetNames: ['data'] };
  //     const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  
  //     // Create a Blob from the buffer
  //     const data: Blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  //     const url = window.URL.createObjectURL(data);
  
  //     // Create a link element
  //     const link = document.createElement('a');
  //     link.href = url;
  //     link.download = 'StudentMarks.xlsx';
  
  //     // Append the link to the document body and click it to trigger the download
  //     document.body.appendChild(link);
  //     link.click();
  
  //     // Clean up and remove the link
  //     document.body.removeChild(link);
  //   } catch (error) {
  //     console.error('Error downloading Excel file:', error);
  //     this.error = 'Failed to download Excel file. Please check your permissions and try again.';
  //   }
  // }
  
  // getObjectKeys(obj: any): string[] {
  //   return obj ? Object.keys(obj) : [];
  // }
}