import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Chart } from 'chart.js';
import { StudentMarks } from 'src/app/models/marks.model';
import { Faculty, ModuleRange, MarksData, AssignedLectures, Student } from '../models/hod.model';
import { AuthenticationService } from '../services/auths.service';
import { AngularFireAuth } from '@angular/fire/compat/auth';

@Injectable({
  providedIn: 'root'
})
export class HodService {

  constructor(
    private firestore: AngularFirestore,
    private authService: AuthenticationService,
    private afAuth: AngularFireAuth
  ) {}

  async getDepartmentModules(staffInfo: any) {
    const departmentModules = [];
    const facultyRef = this.firestore.collection('faculties').doc(staffInfo.faculty);
    const facultyDoc = await facultyRef.get().toPromise();
    
    if (facultyDoc?.exists) {
      const facultyData = facultyDoc.data() as Faculty;
      for (const department of facultyData.departments) {
        if (department.name === staffInfo.department) {
          if (department.modules) departmentModules.push(...department.modules);
          if (department.streams) {
            for (const streams of Object.values(department.streams)) {
              for (const stream of streams) {
                departmentModules.push(...stream.modules);
              }
            }
          }
        }
      }
    }
    return departmentModules;
  }

  async getModuleDetailsForRange(departmentModules: any[], modulesCodes: string[]) {
    const moduleDetails = [];
    
    for (const moduleCode of modulesCodes) {
      const moduleData = departmentModules.find(m => m.moduleCode === moduleCode);
      if (moduleData) {
        const assignedLecturesSnapshot = await this.firestore
          .collection('assignedLectures')
          .get()
          .toPromise();

        let staffNumber: string | null = null;

        assignedLecturesSnapshot?.docs.forEach(doc => {
          const data = doc.data() as AssignedLectures;
          if (data.modules?.some(module => module.moduleCode === moduleCode)) {
            staffNumber = doc.id;
          }
        });

        moduleDetails.push({
          moduleCode: moduleData.moduleCode,
          moduleName: moduleData.moduleName,
          moduleLevel: moduleData.moduleLevel || '',
          staffNumber: staffNumber,
        });
      }
    }

    return moduleDetails;
  }

  async getModuleAverages(departmentModules: any[]) {
    const moduleRanges: { [key: string]: ModuleRange } = {
      '0-49': { range: '0-49%', modules: [] },
      '50-59': { range: '50-59%', modules: [] },
      '60-69': { range: '60-69%', modules: [] },
      '70-79': { range: '70-79%', modules: [] },
      '80-100': { range: '80-100%', modules: [] }
    };

    for (const module of departmentModules) {
      const moduleCode = module.moduleCode;
      const marksDoc = await this.firestore
        .collection('marks')
        .doc(moduleCode)
        .get()
        .toPromise();

      if (marksDoc?.exists) {
        const marksData = marksDoc.data() as { marks: StudentMarks[] };
        if (marksData?.marks && marksData.marks.length > 0) {
          let totalAverage = 0;
          let studentCount = 0;

          marksData.marks.forEach(studentMark => {
            if (studentMark.average) {
              totalAverage += parseFloat(studentMark.average);
              studentCount++;
            }
          });

          if (studentCount > 0) {
            const moduleAverage = totalAverage / studentCount;
            if (moduleAverage < 50) {
              moduleRanges['0-49'].modules.push({ code: moduleCode, average: moduleAverage });
            } else if (moduleAverage < 60) {
              moduleRanges['50-59'].modules.push({ code: moduleCode, average: moduleAverage });
            } else if (moduleAverage < 70) {
              moduleRanges['60-69'].modules.push({ code: moduleCode, average: moduleAverage });
            } else if (moduleAverage < 80) {
              moduleRanges['70-79'].modules.push({ code: moduleCode, average: moduleAverage });
            } else {
              moduleRanges['80-100'].modules.push({ code: moduleCode, average: moduleAverage });
            }
          }
        }
      }
    }
    return moduleRanges;
  }

  async getAttendanceData(departmentModules: any[]) {
    const moduleAttendance: { [key: string]: { [date: string]: number } } = {};
    
    for (const module of departmentModules) {
      const attendanceDoc = await this.firestore.collection('Attended').doc(module.moduleCode).get().toPromise();
      if (attendanceDoc?.exists) {
        const attendanceData = attendanceDoc.data();
        moduleAttendance[module.moduleCode] = {};
        for (const [date, students] of Object.entries(attendanceData || {})) {
          if (Array.isArray(students)) {
            moduleAttendance[module.moduleCode][date] = students.length;
          }
        }
      }
    }
    return moduleAttendance;
  }

  async getFailingStudents(moduleCode: string) {
    const failingStudentsDetails: Array<Student & { average: number }> = [];
  
    try {
      const moduleDoc = await this.firestore
        .collection('marks')
        .doc(moduleCode)
        .get()
        .toPromise();
  
      if (moduleDoc?.exists) {
        const marksData = moduleDoc.data() as MarksData;
        
        // Type the failing students array explicitly
        interface FailingStudent {
          studentNumber: string;
          average: number;
        }
  
        const failingStudents: FailingStudent[] = Object.values(marksData.marks || [])
          .filter((student: any): student is { studentNumber: string; average: number } => 
            student.average !== undefined && 
            student.average < 45 &&
            student.studentNumber !== undefined
          )
          .map(student => ({
            studentNumber: student.studentNumber,
            average: Number(student.average),
          }));
  
        const studentDetailsPromises = failingStudents.map((student) =>
          this.firestore
            .collection('students')
            .doc(student.studentNumber.toString())
            .get()
            .toPromise()
        );
        
        const studentDocs = await Promise.all(studentDetailsPromises);
  
        // Process student documents with proper type checking
        const validStudentDetails = studentDocs
          .map((doc, index): (Student & { average: number }) | null => {
            if (doc?.exists) {
              const studentData = doc.data() as Student;
              return {
                ...studentData, // Spread the Student properties
                studentNumber: failingStudents[index].studentNumber,
                average: failingStudents[index].average,
                name: studentData.name || 'No Name',
                surname: studentData.surname || 'No Surname',
                email: studentData.email || 'No Email',
              };
            }
            return null;
          })
          .filter((student): student is Student & { average: number } => 
            student !== null
          );
  
        failingStudentsDetails.push(...validStudentDetails);
      }
    } catch (error) {
      console.error('Error fetching failing students:', error);
    }
    
    return failingStudentsDetails;
  }
}