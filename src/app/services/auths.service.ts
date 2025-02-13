import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Staff } from '../models/staff.model';

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {
  private currentStaffSubject = new BehaviorSubject<Staff | null>(null);
  public readonly currentStaff$: Observable<Staff | null> = this.currentStaffSubject.asObservable();

  constructor(
    private afAuth: AngularFireAuth,
    private firestore: AngularFirestore
  ) {
    this.afAuth.authState.pipe(
      switchMap(user => {
        if (!user) {
          this.currentStaffSubject.next(null);
          return Promise.resolve(null);
        }
        
        return this.firestore
          .collection<Staff>('staff', ref => ref.where('email', '==', user.email))
          .get()
          .pipe(
            map(snapshot => {
              if (snapshot.empty) {
                throw new Error('No staff data found for the logged-in user.');
              }
              const staffData = snapshot.docs[0].data() as Staff;
              this.currentStaffSubject.next(staffData);
              return staffData;
            })
          ).toPromise();
      })
    ).subscribe();
  }

  // Explicitly define return type as Observable<boolean>
  isAuthenticated(): Observable<boolean> {
    return this.afAuth.authState.pipe(
      map(user => !!user)
    );
  }

  login(email: string, password: string): Promise<any> {
    return this.afAuth.signInWithEmailAndPassword(email, password);
  }

  async getLoggedInStaff(): Promise<Staff> {
    const currentStaff = this.currentStaffSubject.getValue();
    if (currentStaff) {
      return currentStaff;
    }

    const user = await this.afAuth.currentUser;
    if (!user) {
      throw new Error('User not logged in.');
    }

    const staffSnapshot = await this.firestore
      .collection<Staff>('staff', ref => ref.where('email', '==', user.email))
      .get()
      .toPromise();

    if (!staffSnapshot || staffSnapshot.empty) {
      throw new Error('No staff data found for the logged-in user.');
    }

    const staffData = staffSnapshot.docs[0].data() as Staff;
    this.currentStaffSubject.next(staffData);
    return staffData;
  }

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

  signOut(): Promise<void> {
    this.currentStaffSubject.next(null);
    return this.afAuth.signOut();
  }
}