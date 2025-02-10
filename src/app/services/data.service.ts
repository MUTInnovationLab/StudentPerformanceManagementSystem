import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth'; 
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage'; 
import { Observable, throwError, from } from 'rxjs';
import { catchError, map, switchMap,first } from 'rxjs/operators';
import { lastValueFrom } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { User, Student } from 'src/app/models/users.model';
import { collection } from 'firebase/firestore';
import * as firebase from 'firebase/app';
import 'firebase/firestore';
import { AssignedLectures,Module } from 'src/app/models/assignedModules.model';
import { StudentMarks,TestPercentages,ModuleMarksDocument, RiskCategory} from '../models/studentsMarks.model';
import { EmailService } from './email.service';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  constructor(
    private afs: AngularFirestore,
    private auth: AngularFireAuth,
    private storage: AngularFireStorage,
    private firestore: AngularFirestore,
    private email: EmailService,
    private db: AngularFirestore
  ) { }


  getAllStaff(): Observable<any[]> {
    return this.afs.collection<User>('/staff').snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as User;
        const id = a.payload.doc.id;
        return { ...data, id }; // Correctly include 'id' without duplication
      }))
    );
  }
  getModulesByStaffNumber(staffNumber: string): Observable<Module[]> {
    return this.firestore.collection('assignedLectures').doc<AssignedLectures>(staffNumber)
      .valueChanges()
      .pipe(
        map(doc => doc?.modules || []) // Return the modules array or an empty array if not found
      );
  }

  getAttendanceByModule(moduleId: string): Observable<{ totalSessions: number; attendanceCounts: any }> {
    return this.firestore
      .collection('Attended')
      .doc(moduleId)
      .valueChanges()
      .pipe(
        map((attendanceData: any) => {
          // Ensure attendanceData is an array
          const attendanceArray = Array.isArray(attendanceData) ? attendanceData : [];
          
          const attendanceCounts = attendanceArray.reduce((acc: any, entry: any) => {
            const studentNumber = entry.studentNumber;
            acc[studentNumber] = (acc[studentNumber] || 0) + 1;
            return acc;
          }, {});
          
          return {
            totalSessions: attendanceArray.length,
            attendanceCounts
          };
        })
      );
  }
  getModuleMarks(moduleCode: string): Observable<ModuleMarksDocument | null> {
    return this.firestore
      .collection('marks')
      .doc(moduleCode)
      .valueChanges()
      .pipe(
        map((data: any) => {
          if (!data) return null;

          // Transform and validate the data
          const studentMarks: StudentMarks[] = data.marks.map((mark: any) => {
            // Calculate weighted average based on test percentages
            let totalWeightedScore = 0;
            let totalWeight = 0;

            Object.keys(data.testPercentages).forEach((testKey) => {
              const testScore = mark[testKey];
              const testWeight = data.testPercentages[testKey];
              
              if (testScore !== null && testScore !== undefined && testWeight) {
                totalWeightedScore += (testScore * testWeight);
                totalWeight += testWeight;
              }
            });

            // Calculate average only if there are valid scores
            const average = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;

            // Create a properly typed StudentMarks object
            return {
              ...mark,
              moduleCode, // Add this line to include the module code
              studentNumber: mark.studentNumber,
              test1: mark.test1 !== undefined ? Number(mark.test1) : null,
              test2: mark.test2 !== undefined ? Number(mark.test2) : null,
              test3: mark.test3 !== undefined ? Number(mark.test3) : null,
              test4: mark.test4 !== undefined ? Number(mark.test4) : null,
              test5: mark.test5 !== undefined ? Number(mark.test5) : null,
              test6: mark.test6 !== undefined ? Number(mark.test6) : null,
              test7: mark.test7 !== undefined ? Number(mark.test7) : null,
              average: Number(average.toFixed(1))
            };
          });

          // Ensure test percentages match the interface
          const testPercentages: TestPercentages = {
            test1: Number(data.testPercentages.test1) || 0,
            test2: Number(data.testPercentages.test2) || 0,
            test3: Number(data.testPercentages.test3) || 0,
            test4: Number(data.testPercentages.test4) || 0,
            test5: Number(data.testPercentages.test5) || 0,
            test6: Number(data.testPercentages.test6) || 0,
            test7: Number(data.testPercentages.test7) || 0
          };

          // Return the properly formatted document
          return {
            moduleCode,
            marks: studentMarks,
            testPercentages
          };
        })
      );
  }

 
   getMentorsByModule(moduleCode: string) {
    return this.firestore.collection('mentors', ref => ref.where('modules', 'array-contains', moduleCode)).valueChanges();
  }

  // createAssignment(assignment: any) {
  //   return this.firestore.collection('assignments').add(assignment);
  // }


async createAssignment(assignment: any) {


  const studentNumber = assignment.studentNumber;
  const moduleCode = assignment.moduleCode;

  // Create a unique ID using both studentNumber and moduleCode
  const assignmentId = `${studentNumber}_${moduleCode}`;
  // const studentNumber = assignment.studentNumber;

  // Reference to the document
  const docRef = this.firestore.collection('assignments').doc(assignmentId);

  // Get the document as a promise
  const doc = await docRef.get().pipe(first()).toPromise();

  if (doc && doc.exists) {
    // Document exists, return an error message
    
    return { success: false, message: 'This student is already assigned.' };
  } else {
    // Document does not exist, create it with the studentNumber as ID
    await docRef.set(assignment);
    return { success: true, message: 'Assignment created successfully.' };
  }
}

  
  getStudentByNumber(studentNumber: string): Observable<Student | undefined> {
    return this.firestore
      .collection<Student>('students')
      .doc(studentNumber)  // Ensure studentNumber is a string
      .get()
      .pipe(
        map(doc => {
          if (doc.exists) {
            return doc.data() as Student;
          } else {
            return undefined;  // Return undefined if the document doesn't exist
          }
        })
      );
  }

  getDepartmentModuleMarks(department: string): Observable<ModuleMarksDocument[]> {
    return this.firestore
      .collection('marks', ref => ref.where('department', '==', department))
      .valueChanges()
      .pipe(
        map(documents => {
          return documents.map((doc: any) => {
            const marks = this.processMarksWithRiskCategories(doc.marks);
            return {
              ...doc,
              marks
            };
          });
        })
      );
  }

  private processMarksWithRiskCategories(marks: StudentMarks[]): StudentMarks[] {
    return marks.map(mark => ({
      ...mark,
      riskCategory: this.calculateRiskCategory(mark.average)
    }));
  }

  private calculateRiskCategory(average: number): RiskCategory {
    if (average < 40) return RiskCategory.AT_RISK;
    if (average < 50) return RiskCategory.PARTIALLY_AT_RISK;
    if (average < 75) return RiskCategory.INTERMEDIATE;
    return RiskCategory.DISTINCTION;
  }
}

