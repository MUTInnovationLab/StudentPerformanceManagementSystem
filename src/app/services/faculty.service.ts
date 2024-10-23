import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { Faculty, Department, StreamMap } from '../models/faculty.model';
import firebase from 'firebase/compat/app';  // Add this for FieldValue

@Injectable({
  providedIn: 'root'
})
export class FacultyService {
  constructor(private firestore: AngularFirestore) {}

  // Fetch all faculties
  getFaculties(): Observable<Faculty[]> {
    return this.firestore.collection<Faculty>('faculties').valueChanges({ idField: 'id' });
  }

  // Fetch a single faculty by ID
  getFacultyById(id: string): Observable<Faculty | undefined> {
    return this.firestore.doc<Faculty>(`faculties/${id}`).valueChanges();
  }

  // Add a new faculty
  addFaculty(faculty: Faculty): Promise<void> {
    const facultyId = this.firestore.createId();
    return this.firestore.doc(`faculties/${facultyId}`).set({ ...faculty, id: facultyId });
  }

  // Update an existing faculty
  updateFaculty(id: string, faculty: Partial<Faculty>): Promise<void> {
    return this.firestore.doc(`faculties/${id}`).update(faculty);
  }

  // Delete a faculty by ID
  deleteFaculty(id: string): Promise<void> {
    return this.firestore.doc(`faculties/${id}`).delete();
  }

  // Add a new department to a specific faculty
  addDepartment(facultyId: string, department: Department): Promise<void> {
    return this.firestore.doc<Faculty>(`faculties/${facultyId}`).update({
      departments: firebase.firestore.FieldValue.arrayUnion(department)  // Use firebase's FieldValue
    });
  }

  // Update a specific department in a faculty
  updateDepartment(facultyId: string, departmentName: string, updatedDepartment: Department): Promise<void> {
    return this.firestore.doc<Faculty>(`faculties/${facultyId}`).get().toPromise().then(doc => {
      if (doc && doc.exists) {
        const faculty = doc.data() as Faculty;
        const updatedDepartments = faculty.departments.map(dep => dep.name === departmentName ? updatedDepartment : dep);
        return this.firestore.doc(`faculties/${facultyId}`).update({ departments: updatedDepartments });
      } else {
        throw new Error('Faculty not found');
      }
    });
  }

  // Delete a department from a faculty
  deleteDepartment(facultyId: string, departmentName: string): Promise<void> {
    return this.firestore.doc<Faculty>(`faculties/${facultyId}`).get().toPromise().then(doc => {
      if (doc && doc.exists) {
        const faculty = doc.data() as Faculty;
        const updatedDepartments = faculty.departments.filter(dep => dep.name !== departmentName);
        return this.firestore.doc(`faculties/${facultyId}`).update({ departments: updatedDepartments });
      } else {
        throw new Error('Faculty not found');
      }
    });
  }

  // Add a stream to a specific department in a faculty
  addStream(facultyId: string, departmentName: string, streamKey: string, stream: { module: string, credits: number, year: string }): Promise<void> {
    return this.firestore.doc<Faculty>(`faculties/${facultyId}`).get().toPromise().then(doc => {
      if (doc && doc.exists) {
        const faculty = doc.data() as Faculty;
        const updatedDepartments = faculty.departments.map(dep => {
          if (dep.name === departmentName) {
            // Ensure streams is not undefined
            dep.streams = dep.streams || {};
            dep.streams[streamKey] = [...(dep.streams[streamKey] || []), stream];
          }
          return dep;
        });
        return this.firestore.doc(`faculties/${facultyId}`).update({ departments: updatedDepartments });
      } else {
        throw new Error('Faculty not found');
      }
    });
  }

  // Update a stream in a specific department
  updateStream(facultyId: string, departmentName: string, streamKey: string, updatedStream: { module: string, credits: number, year: string }): Promise<void> {
    return this.firestore.doc<Faculty>(`faculties/${facultyId}`).get().toPromise().then(doc => {
      if (doc && doc.exists) {
        const faculty = doc.data() as Faculty;
        const updatedDepartments = faculty.departments.map(dep => {
          if (dep.name === departmentName && dep.streams && dep.streams[streamKey]) {
            dep.streams[streamKey] = dep.streams[streamKey].map(stream =>
              stream.module === updatedStream.module ? updatedStream : stream
            );
          }
          return dep;
        });
        return this.firestore.doc(`faculties/${facultyId}`).update({ departments: updatedDepartments });
      } else {
        throw new Error('Faculty not found');
      }
    });
  }

  // Delete a stream from a specific department in a faculty
  deleteStream(facultyId: string, departmentName: string, streamKey: string, moduleName: string): Promise<void> {
    return this.firestore.doc<Faculty>(`faculties/${facultyId}`).get().toPromise().then(doc => {
      if (doc && doc.exists) {
        const faculty = doc.data() as Faculty;
        const updatedDepartments = faculty.departments.map(dep => {
          if (dep.name === departmentName && dep.streams && dep.streams[streamKey]) {
            dep.streams[streamKey] = dep.streams[streamKey].filter(stream => stream.module !== moduleName);
          }
          return dep;
        });
        return this.firestore.doc(`faculties/${facultyId}`).update({ departments: updatedDepartments });
      } else {
        throw new Error('Faculty not found');
      }
    });
  }
}
