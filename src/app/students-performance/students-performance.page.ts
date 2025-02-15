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
  styleUrls: ['./students-performance.page.scss'],
})
export class StudentsPerformancePage implements OnInit {
  menuVisible: boolean = false;
  students: DetailedStudentInfo[] = [];
  studentsNeedingAttention: DetailedStudentInfo[] = [];
  error: string | null = null;
  errorMessage: string | null = null;
  testOutOf: number[] = Array(7).fill(100); // For testing purposes, each test is out of 100
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
    this.loadStudentMarks();
  }



  openMenu() {
    this.menuVisible = !this.menuVisible;
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
  
      this.studentsNeedingAttention = this.getStudentsNeedingAttention(this.students);
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
        const marksQuery = await this.firestore
          .collection('marks')
          .ref.where('moduleCode', 'in', moduleChunk)
          .get();
  
        if (!marksQuery || marksQuery.empty) {
          throw new Error('Marks query is undefined or empty');
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
          const studentsQuery = await this.firestore
            .collection('students')
            .ref.where('studentNumber', 'in', studentChunk)
            .get();
  
          if (!studentsQuery || studentsQuery.empty) {
            throw new Error('Students query is undefined or empty');
          }
  
          studentsQuery.docs.forEach(doc => {
            studentMap.set(doc.id, doc.data());
          });
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
              const studentDetail: DetailedStudentInfo = {
                studentNumber: mark.studentNumber,
                name: studentData.name ?? 'N/A',
                surname: studentData.surname ?? 'N/A',
                email: studentData.email ?? 'N/A',
                department: studentData.department ?? 'N/A',
                average,
                moduleName: moduleData.moduleName,
                moduleCode: moduleCode,
                marks: {
                  studentNumber: mark.studentNumber,
                  average: mark.average,
                  test1: mark.test1 ?? 0,
                  test2: mark.test2 ?? 0,
                  test3: mark.test3 ?? 0,
                  test4: mark.test4 ?? 0,
                  test5: mark.test5 ?? 0,
                  test6: mark.test6 ?? 0,
                  test7: mark.test7 ?? 0,
                  moduleCode: moduleCode,
                  scanTime: mark.scanTime ?? null // Ensure scanTime is included
                },
                attendance: studentData.attendance ?? {}
              };
              students.push(studentDetail);
            }
          });
        });
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
      const studentsQuery = await this.firestore.collection('students').get().toPromise();
      if (!studentsQuery || studentsQuery.empty) {
        throw new Error('Students query is undefined or empty');
      }
  
      const studentMap = new Map<string, any>();
      studentsQuery.docs.forEach(doc => {
        studentMap.set(doc.id, doc.data());
      });
  
      const marksQuery = await this.firestore.collection('marks').get().toPromise();
      if (!marksQuery || marksQuery.empty) {
        throw new Error('Marks query is undefined or empty');
      }
  
      const moduleMarks = new Map<string, any>();
      marksQuery.docs.forEach(doc => {
        const data = doc.data() as ModuleMarksDocument;
        moduleMarks.set(doc.id, data);
      });
  
      moduleMarks.forEach((moduleData, moduleCode) => {
        moduleData.marks.forEach((mark: any) => {
          if (!mark.studentNumber) return;
  
          const average = mark.average ? Number(mark.average) : 
                         this.calculateStudentAverage(mark, moduleData.testPercentages);
  
          const studentData = studentMap.get(mark.studentNumber.toString());
  
          if (studentData) {
            const studentDetail: DetailedStudentInfo = {
              studentNumber: mark.studentNumber,
              name: studentData.name ?? 'N/A',
              surname: studentData.surname ?? 'N/A',
              email: studentData.email ?? 'N/A',
              department: studentData.department ?? 'N/A',
              average,
              moduleName: moduleData.moduleName,
              moduleCode: moduleCode,
              marks: {
                studentNumber: mark.studentNumber,
                average: mark.average,
                test1: mark.test1 ?? 0,
                test2: mark.test2 ?? 0,
                test3: mark.test3 ?? 0,
                test4: mark.test4 ?? 0,
                test5: mark.test5 ?? 0,
                test6: mark.test6 ?? 0,
                test7: mark.test7 ?? 0,
                moduleCode: moduleCode,
                scanTime: mark.scanTime ?? null // Ensure scanTime is included
              },
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
  
  private getStudentsNeedingAttention(students: DetailedStudentInfo[]): DetailedStudentInfo[] {
    return students.filter(student => {
      const failedTests = [
        student.marks.test1 !== null && student.marks.test1 !== undefined && student.marks.test1 <= (this.testOutOf[0] ?? 0) * 0.5,
        student.marks.test2 !== null && student.marks.test2 !== undefined && student.marks.test2 <= (this.testOutOf[1] ?? 0) * 0.5,
        student.marks.test3 !== null && student.marks.test3 !== undefined && student.marks.test3 <= (this.testOutOf[2] ?? 0) * 0.5,
        student.marks.test4 !== null && student.marks.test4 !== undefined && student.marks.test4 <= (this.testOutOf[3] ?? 0) * 0.5,
        student.marks.test5 !== null && student.marks.test5 !== undefined && student.marks.test5 <= (this.testOutOf[4] ?? 0) * 0.5,
        student.marks.test6 !== null && student.marks.test6 !== undefined && student.marks.test6 <= (this.testOutOf[5] ?? 0) * 0.5,
        student.marks.test7 !== null && student.marks.test7 !== undefined && student.marks.test7 <= (this.testOutOf[6] ?? 0) * 0.5
      ].filter(failed => failed);
      return failedTests.length > 2;
    });
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
  
    for (let i = 1; i <= 7; i++) {
      const testKey = `test${i}`;
      const score = Number(mark[testKey]);
      const weight = testPercentages[testKey];
  
      if (!isNaN(score) && score !== null && weight) {
        totalWeightedScore += (score * weight);
        totalWeight += weight;
      }
    }
  
    return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
  }
  
  getScoreColor(score: number | null | undefined, outOf: number | null | undefined): string {
    if (outOf === null || outOf === undefined || score === null || score === undefined) {
      return 'black';
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
  
  getScoreColorClass(score: number, outOf: number): string {
    const percentage = (score / outOf) * 100;
    if (percentage >= 75) {
      return 'good-performance-bg';
    } else if (percentage >= 50) {
      return 'moderate-performance-bg';
    } else {
      return 'poor-performance-bg';
    }
  }
  
  hasTestMarks(testNumber: number): boolean {
    return this.students.some(student => student.marks[`test${testNumber}`] !== null && student.marks[`test${testNumber}`] !== undefined && student.marks[`test${testNumber}`] !== 0);
  }
  
  handleFileInput(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        this.processExcelData(jsonData);
      };
      reader.readAsArrayBuffer(file);
    }
  }
  
  processExcelData(data: any[]) {
    const headers = data[0];
    const rows = data.slice(1);
    const uploadedStudents: DetailedStudentInfo[] = rows.map(row => {
      const student: any = {};
      headers.forEach((header: string, index: number) => {
        student[header] = row[index];
      });
  
      // Parse attendance data
      const attendanceEntries = student.attendance ? student.attendance.split('\n').map((entry: string) => entry.split(': ')) : [];
      const attendanceData: { [module: string]: string } = {};
      attendanceEntries.forEach(([module, time]: [string, string]) => {
        attendanceData[module] = time;
      });
  
      return {
        studentNumber: student.studentNumber,
        name: student.name,
        surname: student.surname,
        email: student.email,
        department: student.department,
        average: student.average,
        moduleName: student.moduleName,
        moduleCode: student.moduleCode, // Add moduleCode property
        marks: {
          studentNumber: student.studentNumber,
          average: student.average,
          test1: student.test1 ?? null,
          test2: student.test2 ?? null,
          test3: student.test3 ?? null,
          test4: student.test4 ?? null,
          test5: student.test5 ?? null,
          test6: student.test6 ?? null,
          test7: student.test7 ?? null,
          moduleCode: student.moduleCode, // Ensure moduleCode is included
          scanTime: student.scanTime ?? null // Ensure scanTime is included
        },
        attendance: attendanceData // Include parsed attendance data
      };
    });
  
    const filteredUploadedStudents = uploadedStudents.filter(student => {
      return this.students.some(existingStudent => existingStudent.studentNumber === student.studentNumber);
    });
  
    this.studentsNeedingAttention = this.getStudentsNeedingAttention(filteredUploadedStudents);
  }
  
  onFileChange(event: any) {
    this.handleFileInput(event);
  }
  
  downloadExcel() {
    try {
      const filteredStudents = this.students.map(student => {
        const filteredMarks = Object.keys(student.marks)
          .filter(key => student.marks[key] !== null && typeof student.marks[key] === 'number')
          .reduce((obj, key) => {
            obj[key] = student.marks[key];
            return obj;
          }, {} as any);
  
        const attendance = this.getObjectKeys(this.studentsAttendance[student.studentNumber])
          .map(module => `${module}: ${this.studentsAttendance[student.studentNumber][module]}`)
          .join('\n');
  
        return {
          studentNumber: student.studentNumber,
          name: student.name,
          surname: student.surname,
          email: student.email,
          department: student.department,
          moduleName: student.moduleName,
          average: student.average,
          attendance, // Include formatted attendance
          ...filteredMarks
        };
      });
  
      const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(filteredStudents);
      const workbook: XLSX.WorkBook = { Sheets: { 'data': worksheet }, SheetNames: ['data'] };
      const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  
      // Create a Blob from the buffer
      const data: Blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(data);
  
      // Create a link element
      const link = document.createElement('a');
      link.href = url;
      link.download = 'StudentMarks.xlsx';
  
      // Append the link to the document body and click it to trigger the download
      document.body.appendChild(link);
      link.click();
  
      // Clean up and remove the link
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading Excel file:', error);
      this.error = 'Failed to download Excel file. Please check your permissions and try again.';
    }
  }
  
  getObjectKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }
}