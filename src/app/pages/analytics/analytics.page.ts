import { Component, OnInit } from '@angular/core';
import { FirestoreService } from 'src/app/services/firestore.service';
import { AuthenticationService } from '../../services/auths.service';
import { Router } from '@angular/router';



@Component({
  selector: 'app-analytics',
  templateUrl: './analytics.page.html',
  styleUrls: ['./analytics.page.scss'],
})
export class AnalyticsPage implements OnInit {
  menuVisible: boolean = false;
  attendedModules: any[] = [];

  constructor(
    private firestoreService: FirestoreService,private router: Router, private authService: AuthenticationService,
    

  ) { }

  ngOnInit(): void {
    this.firestoreService.getAttendedModules().subscribe(data => {
      this.attendedModules = data;
      console.log(this.attendedModules); // Check the structure
    });
  }
  openMenu() {
    this.menuVisible = !this.menuVisible;
  }
  Dashboard(){
    this.router.navigate(['/dashboard']);  // Ensure you have this route set up
    this.menuVisible = false;

  }
 
  goToMeeting() {
    this.router.navigate(['/live-meet']);  // Ensure you have this route set up
    this.menuVisible = false;  // Hide the menu after selecting
  }
  async logout() {
    try {
      await this.authService.signOut();
      this.router.navigate(['/login']); // Redirect to login page after logout
      this.menuVisible = false;  // Hide the menu after logging out
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  // Helper to get the keys of the 'dates' object (i.e., the dates)
  objectKeys(obj: any): string[] {
    return Object.keys(obj);
  }
}
