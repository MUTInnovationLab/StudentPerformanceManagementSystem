import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth'; // Ensure you have this import

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {
  getLoggedInStaff(): any {
    throw new Error('Method not implemented.');
  }
  constructor(private afAuth: AngularFireAuth) {}

  // Login method using Firebase Authentication
  login(email: string, password: string) {
    return this.afAuth.signInWithEmailAndPassword(email, password);
  }

  // Other authentication-related methods...
}
