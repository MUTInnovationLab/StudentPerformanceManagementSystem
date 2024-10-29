import { Component } from '@angular/core';
import { Router } from '@angular/router';

interface StatCard {
  title: string;
  count: number;
  icon: string;
  color: string;
}

interface PerformanceData {
  month: string;
  students: number;
  assignments: number;
  attendance: number;
}

@Component({
  selector: 'app-admin',
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss'],
})
export class AdminPage {
  stats: StatCard[] = [
    { title: 'Lecturers', count: 45, icon: 'school', color: 'primary' },
    { title: 'Mentors', count: 32, icon: 'people', color: 'secondary' },
    { title: 'Students', count: 856, icon: 'person', color: 'tertiary' },
    { title: 'Courses', count: 24, icon: 'book', color: 'success' }
  ];

  performanceData: PerformanceData[] = [
    { month: 'Jan', students: 85, assignments: 78, attendance: 92 },
    { month: 'Feb', students: 88, assignments: 82, attendance: 90 },
    { month: 'Mar', students: 90, assignments: 85, attendance: 94 },
    { month: 'Apr', students: 87, assignments: 80, attendance: 91 },
    { month: 'May', students: 92, assignments: 88, attendance: 95 }
  ];

  academicStats = {
    passingRate: 87,
    averageGrade: 3.4,
    completionRate: 92,
    satisfactionRate: 88
  };

  constructor(private router: Router) {}

  navigateHome() {
    this.router.navigate(['/home']);
  }
}
