import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { ModalController } from '@ionic/angular';
import { Chart, registerables } from 'chart.js';

interface Faculty {
  id: string;
  name: string;
  departments: Department[];
}

interface Department {
  name: string;
  modules: Module[];
}

interface Module {
  moduleCode: string;
  moduleName: string;
  lecturer: string;
  department: string;
  faculty: string;
}

interface ModulePerformance {
  moduleCode: string;
  averageMark: number;
  attendanceRate: number;
  lecturer: string;
  atRiskCount: number;
}

interface FacultyAnalytics {
  facultyId: string;
  facultyName: string;
  averagePerformance: number;
  averageAttendance: number;
  atRiskStudentsCount: number;
  lowPerformingModules: ModulePerformance[];
  performanceCategory: 'HIGH' | 'MEDIUM' | 'LOW';
}

@Component({
  selector: 'app-super-analytics',
  templateUrl: './super-analytics.page.html',
  styleUrls: ['./super-analytics.page.scss']
})
export class SuperAnalyticsPage implements OnInit {
  facultyAnalytics$: Observable<FacultyAnalytics[]> = new Observable(); // Initialize as empty observable
  performanceChart: Chart | null = null;
  attendanceChart: Chart | null = null;

  constructor(
    private firestore: AngularFirestore,
    private modalController: ModalController
  ) {
    Chart.register(...registerables);
  }

  ngOnInit() {
    this.loadFacultyAnalytics();
    this.initializeCharts();
  }

  private loadFacultyAnalytics() {
    const faculties$ = this.firestore.collection<Faculty>('faculties').valueChanges();
    const marks$ = this.firestore.collection<any>('marks').valueChanges();
    const attendance$ = this.firestore.collection('Attended').valueChanges();

    this.facultyAnalytics$ = combineLatest([faculties$, marks$, attendance$]).pipe(
      map(([faculties, marks, attendance]) => {
        return faculties.map(faculty => this.analyzeFaculty(faculty, marks, attendance));
      }),
      map(analytics => this.categorizeFaculties(analytics))
    );
  }

  private analyzeFaculty(faculty: Faculty, marks: any[], attendance: any[]): FacultyAnalytics {
    let totalMarks = 0;
    let totalStudents = 0;
    let atRiskStudents: Set<string> = new Set();
    let modulePerformances: ModulePerformance[] = [];

    faculty.departments.forEach(dept => {
      dept.modules.forEach(module => {
        const moduleMarks = marks.filter(m => m.moduleCode === module.moduleCode);
        const moduleAttendance = this.calculateModuleAttendance(attendance, module.moduleCode);
        
        const averageMark = this.calculateAverageMark(moduleMarks);
        const atRiskCount = this.identifyAtRiskStudents(moduleMarks, atRiskStudents);
        
        modulePerformances.push({
          moduleCode: module.moduleCode,
          averageMark,
          attendanceRate: moduleAttendance,
          lecturer: module.lecturer,
          atRiskCount
        });

        totalMarks += averageMark * moduleMarks.length;
        totalStudents += moduleMarks.length;
      });
    });

    const averagePerformance = totalStudents > 0 ? totalMarks / totalStudents : 0;
    const averageAttendance = this.calculateFacultyAttendance(attendance, faculty.id);

    return {
      facultyId: faculty.id,
      facultyName: faculty.name,
      averagePerformance,
      averageAttendance,
      atRiskStudentsCount: atRiskStudents.size,
      lowPerformingModules: modulePerformances
        .filter(m => m.averageMark < 50)
        .sort((a, b) => a.averageMark - b.averageMark),
      performanceCategory: 'MEDIUM'
    };
  }

  private categorizeFaculties(analytics: FacultyAnalytics[]): FacultyAnalytics[] {
    const sorted = [...analytics].sort((a, b) => b.averagePerformance - a.averagePerformance);
    const total = sorted.length;
    
    return sorted.map((faculty, index) => ({
      ...faculty,
      performanceCategory: 
        index < total / 3 ? 'HIGH' :
        index < (total * 2) / 3 ? 'MEDIUM' : 'LOW'
    }));
  }

  private calculateModuleAttendance(attendance: any[], moduleCode: string): number {
    // Placeholder logic for calculating module attendance
    return 0;
  }

  private calculateAverageMark(marks: any[]): number {
    if (!marks.length) return 0;
    return marks.reduce((sum, mark) => sum + mark.average, 0) / marks.length;
  }

  private calculateFacultyAttendance(attendance: any[], facultyId: string): number {
    // Placeholder logic for calculating faculty attendance rate
    return 0;
  }

  private identifyAtRiskStudents(marks: any[], atRiskStudents: Set<string>): number {
    marks.forEach(mark => {
      if (mark.average < 50) {
        atRiskStudents.add(mark.studentNumber);
      }
    });
    return atRiskStudents.size;
  }

  
  async showModuleDetails(module: ModulePerformance) {
    // Instead of opening a modal, you could log the module details for now
    console.log(module);
  
    // If you want to show the data in a different way (like a simple alert):
    alert(`Module: ${module.moduleCode}\nLecturer: ${module.lecturer}\nPerformance: ${module.averageMark}%\nAttendance: ${module.attendanceRate}%`);
  }
  
  private initializeCharts() {
    if (this.facultyAnalytics$) {
      this.facultyAnalytics$.subscribe(analytics => {
        this.createPerformanceChart(analytics);
        this.createAttendanceChart(analytics);
      });
    }
  }

  private createPerformanceChart(analytics: FacultyAnalytics[]) {
    const ctx = document.getElementById('performanceChart') as HTMLCanvasElement;
    if (!ctx) return;

    this.performanceChart?.destroy();
    this.performanceChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: analytics.map(a => a.facultyName),
        datasets: [{
          label: 'Academic Performance',
          data: analytics.map(a => a.averagePerformance),
          backgroundColor: analytics.map(a => {
            switch(a.performanceCategory) {
              case 'HIGH': return '#4CAF50';
              case 'MEDIUM': return '#FFC107';
              case 'LOW': return '#F44336';
            }
          })
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Faculty Academic Performance'
          }
        }
      }
    });
  }

  private createAttendanceChart(analytics: FacultyAnalytics[]) {
    const ctx = document.getElementById('attendanceChart') as HTMLCanvasElement;
    if (!ctx) return;

    this.attendanceChart?.destroy();
    this.attendanceChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: analytics.map(a => a.facultyName),
        datasets: [{
          label: 'Attendance Rates',
          data: analytics.map(a => a.averageAttendance),
          backgroundColor: analytics.map(a => '#2196F3')
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Faculty Attendance Rates'
          }
        }
      }
    });
  }
}
