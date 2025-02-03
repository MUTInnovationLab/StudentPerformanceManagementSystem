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
  userRole: string = '';
  authorizedPages: any[] = [];

  private allPages = [
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
      if (user?.email) {
        this.getUserRole(user.email);
      } else {
        console.log('No authenticated user found');
        this.router.navigateByUrl('/login');
      }
    });
  }

  private getUserRole(email: string) {
    this.firestore.collection('staff', ref => ref.where('email', '==', email))
      .get()
      .subscribe(snapshot => {
        if (!snapshot.empty) {
          const userDoc = snapshot.docs[0].data() as { position?: string };
          this.userRole = userDoc.position || '';
          this.updateAuthorizedPages();
        } else {
          console.error('User not found in Firestore');
          this.router.navigateByUrl('/login');
        }
      }, error => {
        console.error('Firestore Error:', error);
      });
  }

  private updateAuthorizedPages() {
    if (this.userRole) {
      this.authorizedPages = this.allPages.filter(page => 
        page.roles.includes(this.userRole)
      );
    } else {
      this.authorizedPages = [];
    }
  }

  navigateTo(path: string) {
    this.router.navigateByUrl(path);
  }

  logout() {
    this.afAuth.signOut().then(() => {
      this.router.navigateByUrl('/login');
    }).catch((error) => {
      console.error('Logout error:', error);
    });
  }
}