import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements OnInit {
  userRole: string = ''; // Store user role

  pages = [
    { title: 'Admin', path: '/admin', roles: ['dept-admin', 'Super Admin'], description: 'Manage system settings', icon: 'settings-outline' },
    { title: 'Super Admin', path: '/super-admin', roles: ['dept-admin', 'Super Admin'], description: 'Admin panel access', icon: 'key-outline' },
    { title: 'View Staff', path: '/view-staff', roles: ['dept-admin', 'Super Admin'], description: 'Staff management', icon: 'briefcase-outline' },

    { title: 'Analytics', path: '/analytics', roles: ['Lecturer', 'HOD'], description: 'View system analytics', icon: 'analytics-outline' },
    { title: 'CSV Upload', path: '/csv', roles: ['Lecturer'], description: 'Upload student data', icon: 'cloud-upload-outline' },
    { title: 'HOD Analytics', path: '/hod-analytics', roles: ['Lecturer', 'HOD'], description: 'Department reports', icon: 'bar-chart-outline' },
    { title: 'Support Feedback', path: '/supportfeedback', roles: ['Lecturer', 'HOD'], description: 'User feedback', icon: 'chatbubble-ellipses-outline' },
    { title: 'Struggling Students', path: '/struggling-students', roles: ['Lecturer', 'HOD'], description: 'Monitor students', icon: 'alert-circle-outline' },
    { title: 'Students Performance', path: '/students-performance', roles: ['Lecturer', 'HOD'], description: 'Performance tracking', icon: 'stats-chart-outline' },
    { title: 'Live Meet', path: '/live-meet', roles: ['Lecturer', 'HOD'], description: 'Schedule live meetings', icon: 'videocam-outline' },
    { title: 'Student Management', path: '/student-management', roles: ['Lecturer', 'HOD'], description: 'Manage students', icon: 'school-outline' },
    { title: 'Department Analytics', path: '/department-analytics', roles: ['Lecturer', 'HOD'], description: 'Department insights', icon: 'trending-up-outline' },

    { title: 'Add Lecturer', path: '/add-lecturer', roles: ['HOD'], description: 'Add new lecturers', icon: 'person-add-outline' },
    { title: 'Mentors', path: '/mentors', roles: ['HOD'], description: 'Manage mentor profiles', icon: 'people-outline' },

    { title: 'Faculty Analytics', path: '/faculty-analytic', roles: ['Dean'], description: 'Faculty reports', icon: 'pie-chart-outline' },
    { title: 'Module Mentorship', path: '/module-mentorship', roles: ['Dean'], description: 'Mentorship tracking', icon: 'book-outline' },
  ];

  constructor(
    private router: Router,
    private afAuth: AngularFireAuth,
    private firestore: AngularFirestore
  ) {}

  ngOnInit() {
    this.afAuth.authState.subscribe(user => {
      if (user?.email) { // Ensure email is not null
        console.log('Authenticated Email:', user.email); // Debugging: Check email
        this.getUserRole(user.email);
      } else {
        console.log('No authenticated user found.');
      }
    });
  }
  logout() {
    this.afAuth.signOut().then(() => {
      console.log('User logged out');
      this.router.navigateByUrl('/login'); // Redirect to login page after logout
    }).catch((error) => {
      console.error('Logout error:', error);
    });
  }
  

  getUserRole(email: string) {
    this.firestore.collection('staff', ref => ref.where('email', '==', email))
    .get()
      .subscribe(snapshot => {
        if (!snapshot.empty) {
          const userDoc = snapshot.docs[0].data() as { position?: string }; // ✅ Type assertion
          this.userRole = userDoc.position || ''; // Extract role
          console.log('User Role:', this.userRole); // Debugging: Check fetched role
        } else {
          console.error('User not found in Firestore'); // Debugging: No user in DB
        }
      }, error => {
        console.error('Firestore Error:', error);
      });
  }
  
  isAuthorized(pageRoles: string[]): boolean {
    return Boolean(this.userRole) && pageRoles.includes(this.userRole);  // Ensures the result is always boolean
  }
  

  navigateTo(path: string, pageRoles: string[]) {
    if (this.isAuthorized(pageRoles)) {
      this.router.navigateByUrl(path);
    } else {
      console.warn('Access Denied: You are not authorized to view this page');
    }
  }
}
