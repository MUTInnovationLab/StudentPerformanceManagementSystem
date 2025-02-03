import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Feedback } from '../models/feedback.model'; // Make sure the path is correct
import { Student } from '../models/student.model';
import { Module, AssignedLectures } from '../models/assignedModules.model';

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  constructor(private firestore: AngularFirestore) { }

  addFeedback(feedback: Feedback) {
    return this.firestore.collection('feedback').add(feedback);
  }

  getFeedbacks(studentId: number) {
    return this.firestore.collection('feedback', ref => ref.where('studentId', '==', studentId)).valueChanges();
  }
    getStudents() {
    return this.firestore.collection<Student>('students').valueChanges();
  }

  getAssignedModules(staffNumber: string): Observable<Module[]> {
    console.log('Fetching modules for staff number:', staffNumber);
    return this.firestore
      .collection('assignedLectures')
      .doc(staffNumber)
      .valueChanges()
      .pipe(
        map((doc: any) => {
          console.log('Raw document data:', doc);
          return doc?.modules || [];
        })
      );
  }

  getAttendedModules(moduleCodes: string[]): Observable<any[]> {
    console.log('Searching for module codes:', moduleCodes);
    return this.firestore
      .collection('Attended')
      .get()
      .pipe(
        map(snapshot => {
          return snapshot.docs
            .filter(doc => moduleCodes.includes(doc.id))
            .map(doc => {
              const moduleCode = doc.id;
              const dates = doc.data();
              console.log(`Attendance data for ${moduleCode}:`, dates);
              return {
                moduleName: moduleCode,
                dates: dates
              };
            });
        })
      );
  }
}