import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AlertController, ModalController, ToastController } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

export interface UserProfile {
  email: string;
  displayName: string;
  photoURL: string;
  fullName: string;
  position: string;
  staffNumber: string;
  uid?: string;
}

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  userProfile$!: Observable<UserProfile>;
  editProfileForm!: FormGroup;
  isEditing = false;
  defaultAvatarUrl: string = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2NjYyI+PHBhdGggZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyczQuNDggMTAgMTAgMTAgMTAtNC40OCAxMC0xMFMxNy41MiAyIDEyIDJ6bTAgM2MyLjY3IDAgNC44NCAyLjE3IDQuODQgNC44NCAwIDIuNjctMi4xNyA0Ljg0LTQuODQgNC44NC0yLjY3IDAtNC44NC0yLjE3LTQuODQtNC44NCAwLTIuNjcgMi4xNy00Ljg0IDQuODQtNC44NHptMCAxM2MtMi45NSAwLTUuNTgtMS4zMy03LjMzLTMuNDIgMS41NC0yLjQzIDQuODQgMy41NS01LjM4IDYuMjAtNi40NCAyLjk1LTMuMTcgMy43OC00LjMwLTIuMTcgMS4zOS0xLjMzIDQuODQtMy4wMSAzLjgwIDQuNTctNi4zOCAyLjM0LTMuNTcgMy44NC01LjM2IDYuMjQtMS42NCAwLTIuMTgtMy42LTAuMyAyLjMuMy40eiIvPjwvc3ZnPg==';

  constructor(
    private auth: AngularFireAuth,
    private firestore: AngularFirestore,
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController,
    private formBuilder: FormBuilder
  ) {}

  ngOnInit() {
    this.userProfile$ = this.auth.authState.pipe(
      switchMap(user => {
        if (!user) {
          return of(this.getEmptyProfile());
        }

        const userDoc = this.firestore.collection('staff', ref => ref.where('email', '==', user.email!)).valueChanges();
        return userDoc.pipe(
          map((profiles: any[]) => {
            const profile = profiles[0];
            if (!profile) {
              return this.getEmptyProfile();
            }

            return {
              email: user.email || '',
              fullName: profile.fullName || '',
              position: profile.position || '',
              staffNumber: profile.staffNumber || '',
              displayName: user.displayName || '',
              photoURL: user.photoURL || '',
              uid: user.uid,
            };
          })
        );
      })
    ) as Observable<UserProfile>;

    // Initialize the form when the user profile is loaded
    this.userProfile$.subscribe(user => {
      this.initializeEditForm(user);
    });
  }
  

  private initializeEditForm(user: UserProfile) {
    this.editProfileForm = this.formBuilder.group({
      fullName: [user.fullName, [Validators.required, Validators.minLength(2)]],
      position: [user.position, [Validators.required]],
      staffNumber: [user.staffNumber, [Validators.required]]
    });
  }


  private getEmptyProfile(): UserProfile {
    return {
      email: '',
      displayName: '',
      photoURL: '',
      fullName: '',
      position: '',
      staffNumber: ''
    };
  }

  toggleEditMode() {
    this.isEditing = !this.isEditing;
  }

  async updateProfile() {
    if (this.editProfileForm.invalid) {
      const toast = await this.toastController.create({
        message: 'Please fill in all required fields correctly.',
        duration: 2000,
        color: 'danger'
      });
      await toast.present();
      return;
    }
  
    try {
      const user = await this.auth.currentUser;
      if (!user) {
        throw new Error('No authenticated user found');
      }
  
      const updatedProfile = {
        fullName: this.editProfileForm.value.fullName,
        position: this.editProfileForm.value.position,
        staffNumber: this.editProfileForm.value.staffNumber,
        email: user.email
      };
  
      // Use await and specify the return type
      const staffQuery = await this.firestore.collection('staff', ref => ref.where('email', '==', user.email!)).get().toPromise();
      
      if (staffQuery && !staffQuery.empty) {
        const docId = staffQuery.docs[0].id;
        await this.firestore.collection('staff').doc(docId).update(updatedProfile);
  
        const toast = await this.toastController.create({
          message: 'Profile updated successfully!',
          duration: 2000,
          color: 'success'
        });
        await toast.present();
  
        this.isEditing = false;
      } else {
        throw new Error('No matching staff document found');
      }
    } catch (error) {
      console.error('Profile update error', error);
      const toast = await this.toastController.create({
        message: 'Failed to update profile. Please try again.',
        duration: 2000,
        color: 'danger'
      });
      await toast.present();
    }
    }  async updateProfilePhoto() {
    const alert = await this.alertController.create({
      header: 'Update Profile Photo',
      message: 'Photo update functionality will be implemented using file upload or camera access.',
      buttons: ['OK']
    });
    await alert.present();
  }

  async logout() {
    try {
      await this.auth.signOut();
      
      // Explicitly reset the userProfile$ observable
      this.userProfile$ = of({
        email: '',
        displayName: '',
        photoURL: '',
        fullName: '',
        position: '',
        staffNumber: ''
      });
      
      // Reset the editing state
      this.isEditing = false;
      
      // Navigate to login page
      this.router.navigate(['/login'], { 
        replaceUrl: true 
      });
      
      const toast = await this.toastController.create({
        message: 'Logged out successfully',
        duration: 2000,
        color: 'success'
      });
      await toast.present();
    } catch (error) {
      console.error('Logout error', error);
      const toast = await this.toastController.create({
        message: 'Failed to log out. Please try again.',
        duration: 2000,
        color: 'danger'
      });
      await toast.present();
    }
  }
}