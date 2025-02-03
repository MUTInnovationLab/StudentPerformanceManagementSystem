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
  id: string; 
  department: string;
  email: string;
  fullName: string;
  module: string; 
  modules: string[];
  phoneNumber: string;
  password: string; 
  confirmPassword: string; 
}

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {
  private cachedStaff: Staff | null = null;

  constructor(private afAuth: AngularFireAuth, private firestore: AngularFirestore) {}

  // Login method using Firebase Authentication
  login(email: string, password: string) {
    this.cachedStaff = null; // Clear cache on new login
    return this.afAuth.signInWithEmailAndPassword(email, password);
  }

  async getLoggedInStaff(): Promise<Staff> {
    if (this.cachedStaff) {
      console.log('Using cached staff:', this.cachedStaff); // Log the cached staff
      return this.cachedStaff;
    }

    const user = await this.afAuth.currentUser;

    if (!user) {
      throw new Error('User not logged in.');
    }

    const staffDataSnapshot = await this.firestore
      .collection<Staff>('staff', (ref) => ref.where('email', '==', user.email))
      .get()
      .toPromise();

    if (!staffDataSnapshot || staffDataSnapshot.empty) {
      throw new Error('No staff data found for the logged-in user.');
    }

    this.cachedStaff = staffDataSnapshot.docs[0].data() as Staff;
    console.log('Fetched staff data:', this.cachedStaff); // Log the fetched staff data
    return this.cachedStaff;
  }

  // Get the faculty of the logged-in staff
  async getLoggedInFaculty(): Promise<string> {
    const staff = await this.getLoggedInStaff();
    return staff.faculty;
  }
  async isHOD(): Promise<boolean> {
    const staff = await this.getLoggedInStaff();
    return staff.position === 'HOD';
  }

  async getLoggedInDepartment(): Promise<string> {
    const staff = await this.getLoggedInStaff();
    return staff.department;
  }

  signOut() {
    this.cachedStaff = null; // Clear cache on logout
    return this.afAuth.signOut();
  }
}