import { Component, OnInit } from '@angular/core';
import { FirestoreService } from 'src/app/services/firestore.service';
import { AuthenticationService } from '../../services/auths.service';
import { Router } from '@angular/router';
import { Module } from '../../models/assignedModules.model';
import { switchMap } from 'rxjs/operators';
import { ModuleAttendance } from '../../models/attendancePerfomance.model';



@Component({
  selector: 'app-analytics',
  templateUrl: './analytics.page.html',
  styleUrls: ['./analytics.page.scss'],
})
export class AnalyticsPage implements OnInit {
  menuVisible: boolean = false;
  attendedModules: ModuleAttendance[] = [];
  assignedModules: Module[] = [];

  constructor(
    private firestoreService: FirestoreService,private router: Router, private authService: AuthenticationService,
    

  ) { }

  ngOnInit(): void {
    this.loadModules();
  }

  private loadModules() {
    this.authService.getLoggedInStaff().then(staff => {
      console.log('Staff number:', staff.staffNumber);
      if (!staff.staffNumber) {
        console.error('No staff number found!');
        return;
      }

      this.firestoreService.getAssignedModules(staff.staffNumber)
        .pipe(
          switchMap(modules => {
            console.log('Retrieved modules:', modules);
            this.assignedModules = modules;
            const moduleCodes = modules.map(m => m.moduleCode);
            console.log('Module codes to search:', moduleCodes);
            if (moduleCodes.length === 0) {
              console.warn('No module codes found for staff member');
              return [];
            }
            return this.firestoreService.getAttendedModules(moduleCodes);
          })
        )
        .subscribe({
          next: (data: ModuleAttendance[]) => {
            this.attendedModules = data;
            console.log('Final attendance data:', this.attendedModules);
          },
          error: (error) => {
            console.error('Error loading modules:', error);
          }
        });
    }).catch(error => {
      console.error('Error getting staff details:', error);
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
      this.loadModules(); // Ensure the loadModules method is called after a new login to fetch the correct data
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
