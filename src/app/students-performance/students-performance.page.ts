import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AuthenticationService } from '../services/auths.service';
import { AcademicService } from '../services/academic.service';
import { ModuleMarksDocument, DetailedStudentInfo } from '../models/studentsMarks.model';
import { Faculty, Department, Module } from '../models/faculty.model';

@Component({
  selector: 'app-students-performance',
  templateUrl: './students-performance.page.html',
  styleUrls: ['./students-performance.page.scss'],
})
export class StudentsPerformancePage implements OnInit {
  students: DetailedStudentInfo[] = [];
  studentsNeedingAttention: DetailedStudentInfo[] = [];
  error: string | null = null;
  testOutOf: number[] = Array(7).fill(100); // For testing purposes, each test is out of 100

  constructor(
    private firestore: AngularFirestore,
    private authService: AuthenticationService,
    private academicService: AcademicService
  ) {}

  ngOnInit() {
    this.loadStudentMarks();
  }

  private async loadStudentMarks() {
    try {
      // Bypass authentication for testing purposes
      const faculty = 'Faculty of Applied and Health Science';
      const facultyRef = this.firestore.collection('faculties').doc(faculty);
      const facultyDoc = await facultyRef.get().toPromise();

      if (!facultyDoc?.exists) {
        this.error = 'Faculty not found';
        return;
      }

      const facultyData = facultyDoc.data() as Faculty;
      const allModules = facultyData.departments.reduce((acc: Module[], dept: Department) => {
        return acc.concat(this.getAllModulesFromDepartment(dept));
      }, []);
      this.students = await this.retrieveStudentMarks(allModules);
      this.studentsNeedingAttention = this.getStudentsNeedingAttention(this.students);
      console.log('Students needing attention:', this.studentsNeedingAttention); // Debug log
    } catch (error) {
      console.error('Error loading student marks:', error);
      this.error = 'Failed to load student marks';
    }
  }

  private getAllModulesFromDepartment(department: Department): Module[] {
    const modules: Module[] = [...(department.modules || [])];
    
    if (department.streams) {
      Object.values(department.streams).forEach(streams => {
        streams.forEach(stream => {
          if (stream.modules) {
            modules.push(...stream.modules);
          }
        });
      });
    }

    return modules;
  }

  private async retrieveStudentMarks(modules: Module[]): Promise<DetailedStudentInfo[]> {
    const students: DetailedStudentInfo[] = [];
    try {
      const moduleChunks = this.chunkArray(modules, 10);
      for (const moduleChunk of moduleChunks) {
        const moduleCodes = moduleChunk.map(m => m.moduleCode);
        const marksQuery = await this.firestore
          .collection('marks')
          .ref.where('moduleCode', 'in', moduleCodes)
          .get();

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

          studentsQuery.docs.forEach(doc => {
            studentMap.set(doc.id, doc.data());
          });
        }

        moduleMarks.forEach((moduleData, moduleCode) => {
          const module = modules.find(m => m.moduleCode === moduleCode);
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
                moduleName: module.moduleName,
                marks: {
                  studentNumber: mark.studentNumber,
                  average: mark.average,
                  test1: mark.test1 ?? 0,
                  test2: mark.test2 ?? 0,
                  test3: mark.test3 ?? 0,
                  test4: mark.test4 ?? 0,
                  test5: mark.test5 ?? 0,
                  test6: mark.test6 ?? 0,
                  test7: mark.test7 ?? 0
                }
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
}