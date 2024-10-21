import { Component, OnInit } from '@angular/core';
import { FirestoreService } from 'src/app/services/firestore.service';

@Component({
  selector: 'app-analytics',
  templateUrl: './analytics.page.html',
  styleUrls: ['./analytics.page.scss'],
})
export class AnalyticsPage implements OnInit {
  attendedModules: any[] = [];

  constructor(
    private firestoreService: FirestoreService
  ) { }

  ngOnInit(): void {
    this.firestoreService.getAttendedModules().subscribe(data => {
      this.attendedModules = data;
      console.log(this.attendedModules); // Check the structure
    });
  }

  // Helper to get the keys of the 'dates' object (i.e., the dates)
  objectKeys(obj: any): string[] {
    return Object.keys(obj);
  }
}
