import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, LoadingController } from '@ionic/angular';
import { AuthenticationService } from 'src/app/services/auths.service';
import { AngularFirestore } from '@angular/fire/compat/firestore'; // Import Firestore
import { AngularFireAuth } from '@angular/fire/compat/auth';
import firebase from 'firebase/compat/app';

interface User {
  email: string;
  staffNumber: string;
  fullName: string;
  position: string;
}

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {
  loginForm: FormGroup;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthenticationService,
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private firestore: AngularFirestore,
    private afAuth: AngularFireAuth // Inject Firestore
  ) {
    // Initialize the form in the constructor
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      staffNumber: ['', [Validators.required]], // Change password input to staffNumber
    });
  }

  ngOnInit() {
    // No additional initialization needed
  }

  async loginUser() {
    if (this.loginForm.valid) {
      const loading = await this.loadingController.create({
        message: 'Please wait...',
      });
      await loading.present();
  
      try {
        const { email, staffNumber } = this.loginForm.value;
  
        // Authenticate user using email and staff number
        const user = await this.authService.login(email, staffNumber);
  
        if (!user) {
          alert("User not found in auth database");
          return;
        }
  
        // Fetch user data from Firestore based on the email
        const userDoc = await this.firestore
          .collection('staff') // Ensure your collection name matches
          .ref.where('email', '==', email)
          .limit(1)
          .get();
  
        if (!userDoc.empty) {
          const userData = userDoc.docs[0].data() as User; // Cast to User interface
  
          // Check if the staff number matches
          if (userData.staffNumber === staffNumber) {
            // Navigate based on the user's position
            switch (userData.position) {
              case 'Dean':
                this.router.navigate(['/faculty-analytic']); // Navigate to faculty-analytics page
                break;
              case 'dept-admin':
                this.router.navigate(['/admin']); // Navigate to AdminPage
                break;
              case 'Lecturer':
                this.router.navigate(['/csv']); // Navigate to CSV Page
                break;
              default:
                this.router.navigate(['/hod-analytics']); // Navigate to HOD's analytics
            }
          } else {
            // If staff number is incorrect, show an alert
            this.showAlert('Login Failed', 'Incorrect staff number');
          }
        } else {
          // If no user found, show an alert
          this.showAlert('Login Failed', 'No user found with this email');
        }
  
        await loading.dismiss();
      } catch (error) {
        await loading.dismiss();
        this.showAlert('Login Error', (error as any).message);
      }
    }
  }
  

  async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK'],
    });
    await alert.present();
  }

  navigateHome() {
    this.router.navigate(['/home']); // Adjust the path according to your routing
  }
}
