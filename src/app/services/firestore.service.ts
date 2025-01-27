import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Feedback } from '../models/feedback.model'; // Make sure the path is correct
import { Student } from '../models/student.model';

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

  // Fetch the data and map it to the expected structure
  getAttendedModules(): Observable<any[]> {
    return this.firestore.collection('Attended').snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data();
        const moduleName = a.payload.doc.id; // e.g., CA100, CF100
        return { moduleName, dates: data };  // each module with its attendance dates
      }))
    );
  }

}
