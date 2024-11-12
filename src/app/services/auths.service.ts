import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { UserCredential } from 'firebase/auth'; 
import { Staff } from '../models/staff.model';

// User interface for staff data
export interface User {
  position: any;
  staffNumber: any;
  role: any;
  id: string; // You may want to adjust how you're storing the ID
  department: string;
  email: string;
  fullName: string;
  module: string; // Single module, if applicable
  modules: string[]; // Array of module names
  phoneNumber: string;
  password: string; // Consider removing this for security reasons
  confirmPassword: string; // Also consider removing this
}

// export interface Staff {
//   position: any;
//   staffNumber: any;
//   department: string;
//   email: string;
//   fullName: string;
//   faculty: string; 
 
// }

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {
  // signInWithEmailAndPassword(email: string, staffNumber: string) {
  //   throw new Error('Method not implemented.');
  // }
  
  constructor(private afAuth: AngularFireAuth, private firestore: AngularFirestore) {}

  // Login method using Firebase Authentication
  login(email: string, password: string) {
    return this.afAuth.signInWithEmailAndPassword(email, password);
  }

  async signInWithEmailAndPassword(email: string, staffNumber: string){
     this.afAuth.signInWithEmailAndPassword(email, staffNumber);
  }


  async getLoggedInStaff(): Promise<Staff> {
    const user = await this.afAuth.currentUser; 

    if (!user) {
      throw new Error('User not logged in.');
    }
    const staffDataSnapshot = await this.firestore
      .collection<Staff>('staff', ref => ref.where('email', '==', user.email))
      .get()
      .toPromise();


    if (!staffDataSnapshot || staffDataSnapshot.empty) {
      throw new Error('No staff data found for the logged-in user.');
    }

    return staffDataSnapshot.docs[0].data() as Staff; 
  }

  async getLoggedInFaculty(): Promise<string> {
    const staff = await this.getLoggedInStaff();
    return staff.faculty; // Return the faculty of the logged-in user
  }
}


