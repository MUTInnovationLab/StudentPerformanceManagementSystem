// profile.component.ts
import { Component, OnInit } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, of } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AlertController, LoadingController } from '@ionic/angular';

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
  defaultAvatarUrl: string = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2NjYyI+PHBhdGggZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyczQuNDggMTAgMTAgMTAgMTAtNC40OCAxMC0xMFMxNy41MiAyIDEyIDJ6bTAgM2MyLjY3IDAgNC44NCAyLjE3IDQuODQgNC44NCAwIDIuNjctMi4xNyA0Ljg0LTQuODQgNC44NC0yLjY3IDAtNC44NC0yLjE3LTQuODQtNC44NCAwLTIuNjcgMi4xNy00Ljg0IDQuODQtNC44NHptMCAxM2MtMi45NSAwLTUuNTgtMS4zMy03LjMzLTMuNDIgMS41NC0yLjQzIDQuODQgMy41NS01LjM4IDYuMjAtNi40NCAyLjk1LTMuMTcgMy43OC00LjMwLTIuMTcgMS4zOS0xLjMzIDQuODQtMy4wMSAzLjgwIDQuNTctNi4zOCAyLjM0LTMuNTcgMy44NC01LjM2IDYuMjQtMS42NCAwLTIuMTgtMy42LTAuMyAyLjMuMy40eiIvPjwvc3ZnPg==';

  constructor(
    private popoverController: PopoverController,
    private auth: AngularFireAuth,
    private firestore: AngularFirestore,
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController
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

  async updateProfilePhoto() {
    const alert = await this.alertController.create({
      header: 'Update Profile Photo',
      message: 'Photo update functionality coming soon',
      buttons: ['OK']
    });
    await alert.present();
  }

  async editProfile() {
    const currentProfile = await this.userProfile$.pipe(take(1)).toPromise();
    if (currentProfile) {
      await this.router.navigate(['/edit-profile'], {
        state: { profile: currentProfile }
      });
    }
  }

  async changePassword() {
    await this.router.navigate(['/change-password']);
  }

  async logout() {
    const loading = await this.loadingController.create({
      message: 'Logging out...'
    });
    await loading.present();

    try {
      await this.auth.signOut();
      await loading.dismiss();
      await this.router.navigate(['/login']);
    } catch (error) {
      await loading.dismiss();
      const alert = await this.alertController.create({
        header: 'Logout Failed',
        message: 'An error occurred while logging out. Please try again.',
        buttons: ['OK']
      });
      await alert.present();
      console.error('Logout error:', error);
    }
  }
}