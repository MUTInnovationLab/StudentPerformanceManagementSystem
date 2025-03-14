import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ModuleAttendance, AttendanceRecord, DailyAttendance } from '../models/attendancePerfomance.model';
import { Module, AssignedLectures } from '../models/assignedModules.model';
import { Feedback } from '../models/feedback.model';
import { Student } from '../models/student.model';
import { Mentor } from '../models/mentor.model'; 

interface AttendanceData {
  [date: string]: {
    studentNumber: string;
    scanTime: string;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  // constructor(private firestore: AngularFirestore) { }

  assignMentor(mentor: Mentor): Promise<any> {
    return this.firestore.collection('mentors').add(mentor).then(docRef => {
      // Update the document with its ID
      return docRef.update({ id: docRef.id });
    });
  }
    constructor(private firestore: AngularFirestore) { }

  getMentors(): Observable<any[]> {
    return this.firestore.collection('mentors').valueChanges();
  }

  getAssignedModules(staffNumber: string): Observable<Module[]> {
    console.log('Fetching assigned modules for staff:', staffNumber);
    return this.firestore
      .collection('assignedLectures')
      .doc(staffNumber)
      .valueChanges()
      .pipe(
        tap(doc => console.log('Raw assigned modules doc:', doc)),
        map((doc: any) => {
          if (doc && doc.modules && Array.isArray(doc.modules)) {
            console.log('Found modules:', doc.modules);
            return doc.modules as Module[];
          }
          console.log('No modules found, returning empty array');
          return [];
        })
      );
  }

  getAllAssignedLectures(): Observable<AssignedLectures[]> {
    console.log('Fetching all assigned lectures');
    return this.firestore
      .collection('assignedLectures')
      .valueChanges()
      .pipe(
        tap(docs => console.log('Raw assigned lectures:', docs)),
        map((docs: any[]) => 
          docs.filter((doc): doc is AssignedLectures => 
            doc && Array.isArray(doc.modules))
        ),
        tap(filtered => console.log('Filtered assigned lectures:', filtered))
      );
  }

  getAttendedModules(moduleCodes: string[]): Observable<ModuleAttendance[]> {
    console.log('Fetching attendance for module codes:', moduleCodes);
    return this.firestore
      .collection('Attended')
      .get()
      .pipe(
        tap(snapshot => {
          console.log('Raw snapshot:', snapshot);
          console.log('Number of documents:', snapshot.docs.length);
        }),
        map(snapshot => {
          const results = snapshot.docs
            .filter(doc => {
              console.log('Checking doc:', doc.id, 'against codes:', moduleCodes);
              return moduleCodes.includes(doc.id);
            })
            .map(doc => {
              console.log('Processing doc:', doc.id);
              const data = doc.data() as AttendanceData;
              console.log('Raw doc data:', data);
              
              const dates: { [key: string]: AttendanceRecord[] } = {};
              
              // Type-safe iteration over the data
              Object.entries(data).forEach(([date, records]) => {
                console.log(`Processing date ${date}:`, records);
                dates[date] = records;
              });
  
              return {
                moduleName: doc.id,
                dates: dates
              };
            });
          
          console.log('Final processed results:', results);
          return results;
        })
      );
  }

  // Student-related methods
  getStudents(): Observable<Student[]> {
    return this.firestore
      .collection('students')
      .valueChanges() as Observable<Student[]>;
  }

  // Add this method to get all students
  async getAllStudents(): Promise<Array<{ studentNumber: string, [key: string]: any }>> {
    try {
      const snapshot = await this.firestore.collection('students').get().toPromise();
      return snapshot ? snapshot.docs.map(doc => doc.data() as { studentNumber: string, [key: string]: any }) : [];
    } catch (error) {
      console.error('Error getting students:', error);
      return [];
    }
  }

  async getEnrolledStudentsForModules(moduleCodes: string[]): Promise<string[]> {
    try {
      const enrolledStudents: string[] = [];
      
      for (const moduleCode of moduleCodes) {
        const enrolledDoc = await this.firestore
          .collection('enrolledModules')
          .doc(moduleCode.trim())
          .get()
          .toPromise();
  
        if (enrolledDoc?.exists) {
          const enrolledData = enrolledDoc.data() as { 
            Enrolled?: Array<{
              studentNumber: string, 
              status: string
            }> 
          };
  
          const students = enrolledData?.Enrolled
            ?.filter(student => student.status === 'Enrolled')
            ?.map(student => student.studentNumber) || [];
            
          enrolledStudents.push(...students);
        }
      }
  
      return [...new Set(enrolledStudents)]; // Remove duplicates
    } catch (error) {
      console.error('Error getting enrolled students:', error);
      return [];
    }
  }
  
  getAllStudentsInDepartment(department: string): Observable<Student[]> {
    return this.firestore
      .collection('students', ref => ref.where('department', '==', department))
      .valueChanges() as Observable<Student[]>;
  }
  
  getDepartmentModules(department: string): Observable<Module[]> {
    return this.getAllAssignedLectures().pipe(
      map(assignments => {
        const departmentModules: Module[] = [];
        assignments.forEach(assignment => {
          assignment.modules
            .filter(module => module.department === department)
            .forEach(module => departmentModules.push(module));
        });
        return departmentModules;
      })
    );
  }

  // Feedback-related methods
  addFeedback(feedback: Feedback): Promise<any> {
    return this.firestore.collection('feedback').add(feedback);
  }

  getFeedbacks(studentId: number): Observable<Feedback[]> {
    return this.firestore
      .collection('feedback', ref => 
        ref.where('studentId', '==', studentId)
      )
      .valueChanges() as Observable<Feedback[]>;
  }
}