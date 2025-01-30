import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Chart, ChartConfiguration, ChartData } from 'chart.js';
import { registerables } from 'chart.js';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AuthenticationService } from '../../services/auths.service';
import { ToastController } from '@ionic/angular';
import { Faculty, Department, Module } from 'src/app/models/faculty.model';
import { AttendanceService, ModuleAttendancePerformance } from '../../services/attendance.service';
import { AcademicService } from '../../services/academic.service';
import { DepartmentPerformance, ModuleAcademicPerformance } from '../../models/departmentPerfomance.model';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-faculty-analytic',
  templateUrl: './faculty-analytic.page.html',
  styleUrls: ['./faculty-analytic.page.scss']
})
export class FacultyAnalyticPage implements OnInit, AfterViewInit {
  menuVisible: boolean = false;
  selectedPerformanceType: 'academic' | 'attendance' = 'academic';
  selectedTime: string = 'all'; 
  faculty: string = '';
  departmentPerformanceChart: Chart | null = null;
  performanceLevelChart: Chart | null = null;
  isLoading: boolean = true;
  departmentStats: DepartmentPerformance[] = [];
  availableMonths: string[] = [];
  staffData: any | null = null;

  private readonly HIGH_PERFORMANCE_THRESHOLD = 75;
  private readonly MEDIUM_PERFORMANCE_THRESHOLD = 50;

  private readonly CHART_COLORS = {
    HIGH: '#22c55e',    
    MEDIUM: '#eab308',  
    LOW: '#ef4444',     
    ACADEMIC: '#4ade80', 
    ATTENDANCE: '#60a5fa' 
  };

  constructor(
    private firestore: AngularFirestore,
    private authService: AuthenticationService,
    private attendanceService: AttendanceService,
    private toastController: ToastController,
    private router: Router,
    private academicService: AcademicService,
    private afAuth: AngularFireAuth,
    private alertController: AlertController,
    private cdr: ChangeDetectorRef
  ) {
    Chart.register(...registerables);
    this.afAuth.setPersistence('local');
  }

  async ngOnInit() {
    this.afAuth.onAuthStateChanged(async (user) => {
      if (user) {
        await this.initializeData();
      } else {
        console.error('No user logged in');
      }
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

  async showLogoutMessage() {
    const alert = await this.alertController.create({
      header: 'Logged Out',
      message: 'You have been successfully logged out.',
      buttons: ['OK']
    });
    await alert.present();
  }

  async initializeData() {
    try {
      this.staffData = await this.authService.getLoggedInStaff();
      if (this.staffData) {
        localStorage.setItem('staffData', JSON.stringify(this.staffData));
        this.faculty = this.staffData.faculty;
        await this.loadAvailableMonths();
        await this.onFacultyChange();
      } else {
        const storedStaffData = localStorage.getItem('staffData');
        if (storedStaffData) {
          this.staffData = JSON.parse(storedStaffData);
          this.faculty = this.staffData.faculty;
          await this.loadAvailableMonths();
          await this.onFacultyChange();
        }
      }
    } catch (error) {
      console.error('Error initializing data:', error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  ngAfterViewInit() {
    setTimeout(() => {
      if (this.departmentStats.length > 0) {
        this.updateCharts();
      }
    }, 0);
  }

  async onPerformanceTypeChange() {
    this.isLoading = true;
    try {
      await this.onFacultyChange();
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  private async onFacultyChange() {
    await this.calculateDepartmentPerformance(this.faculty);
    this.updateCharts();
    this.cdr.detectChanges();
  }

 private async calculateDepartmentPerformance(facultyId: string) {
    this.isLoading = true;
    try {
      const facultyDoc = await this.firestore.doc<Faculty>(`faculties/${facultyId}`).get().toPromise();
      if (facultyDoc?.exists) {
        const faculty = facultyDoc.data() as Faculty;
        this.departmentStats = await this.getDepartmentPerformance(faculty);
      }
    } catch (error) {
      console.error('Error loading faculty data:', error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async loadAvailableMonths() {
    if (!this.faculty) return;
    
    try {
      const facultyDoc = await this.firestore
        .doc<Faculty>(`faculties/${this.faculty}`)
        .get()
        .toPromise();

      if (facultyDoc?.exists) {
        const faculty = facultyDoc.data() as Faculty;
        const allModules = faculty.departments.reduce((modules: Module[], dept: Department) => {
          const deptModules = this.getAllModulesFromDepartment(dept);
          return [...modules, ...deptModules];
        }, []);

        const monthsPromises = allModules.map((module: Module) => 
          this.attendanceService.getAvailableMonths(module.moduleCode)
        );
        
        const allMonthsArrays = await Promise.all(monthsPromises);
        const allMonths = allMonthsArrays.reduce((acc: string[], curr: string[]) => {
          return [...acc, ...curr];
        }, []);
        
        const uniqueMonths = new Set<string>(allMonths);
        this.availableMonths = Array.from(uniqueMonths).sort().reverse(); 
      }
    } catch (error) {
      console.error('Error loading available months:', error);
    }
  }

  async onTimeChange() {
    await this.onFacultyChange();
  }

   private async getDepartmentPerformance(faculty: Faculty): Promise<DepartmentPerformance[]> {
    const departmentPromises = faculty.departments.map(async (department: Department) => {
      const modules = this.getAllModulesFromDepartment(department);
      const [moduleAcademicPerformances, moduleAttendancePerformances] = await Promise.all([
        this.academicService.getModuleAcademicPerformance(modules),
        this.attendanceService.getModuleAttendancePerformance(
          modules,
          this.selectedTime === 'all' ? undefined : this.selectedTime,
          this.selectedTime === 'all' ? 'all' : 'month'
        )
      ]);

      return this.processDepartmentData(
        department,
        moduleAcademicPerformances,
        moduleAttendancePerformances
      );
    });

    return await Promise.all(departmentPromises);
  }
  private getAllModulesFromDepartment(department: Department): Module[] {
    const modules: Module[] = [...(department.modules || [])];
    
    if (department.streams) {
      Object.values(department.streams).forEach(streams => {
        streams.forEach(stream => {
          if (stream.modules) {
            modules.push(...stream.modules);
          }
        });
      });
    }

    return modules;
  }

  private processDepartmentData(
    department: Department,
    academicPerformances: ModuleAcademicPerformance[],
    attendancePerformances: ModuleAttendancePerformance[]
  ): DepartmentPerformance {
    const validAcademicModules = academicPerformances.filter(m => m.totalStudents > 0);
    const validAttendanceModules = attendancePerformances.filter(m => m.totalStudents > 0);

    const academicAverage = validAcademicModules.length > 0 
      ? validAcademicModules.reduce((sum, m) => sum + m.averageMarks, 0) / validAcademicModules.length 
      : 0;

    const attendanceAverage = validAttendanceModules.length > 0 
      ? validAttendanceModules.reduce((sum, m) => sum + m.averageAttendance, 0) / validAttendanceModules.length 
      : 0;

    return {
      name: department.name,
      academicPerformanceRate: academicAverage,
      academicPerformanceLevel: this.getPerformanceLevel(academicAverage),
      attendancePerformanceRate: attendanceAverage,
      attendancePerformanceLevel: this.getPerformanceLevel(attendanceAverage),
      totalStudents: validAcademicModules.reduce((sum, m) => sum + m.totalStudents, 0),
      averageMarks: academicAverage,
      averageAttendance: attendanceAverage,
      modules: this.combineModuleData(department.modules || [], validAcademicModules, validAttendanceModules)
    };
  } 
  private combineModuleData(
    modules: Module[],
    academicData: ModuleAcademicPerformance[],
    attendanceData: ModuleAttendancePerformance[]
  ) {
    return modules.map(m => {
      const academic = academicData.find(am => am.moduleCode === m.moduleCode);
      const attendance = attendanceData.find(am => am.moduleCode === m.moduleCode);
      return {
        moduleCode: m.moduleCode,
        moduleName: m.moduleName,
        averageMarks: academic?.averageMarks || 0,
        averageAttendance: attendance?.averageAttendance || 0,
        totalStudents: academic?.totalStudents || 0,
        totalAttendanceDays: attendance?.totalAttendanceDays || 0,
        totalAttendedStudents: attendance?.totalAttendedStudents || 0
      };
    });
  }
  private getPerformanceLevel(performanceRate: number): 'High' | 'Medium' | 'Low' {
    if (performanceRate >= this.HIGH_PERFORMANCE_THRESHOLD) return 'High';
    if (performanceRate >= this.MEDIUM_PERFORMANCE_THRESHOLD) return 'Medium';
    return 'Low';
  }
  private updateCharts() {
    this.updateDepartmentPerformanceChart();
    this.updatePerformanceLevelChart();
  }
  private updateDepartmentPerformanceChart() {
    if (!this.departmentStats.length) return;

    const performanceData = this.selectedPerformanceType === 'academic' 
      ? this.departmentStats.map(d => d.academicPerformanceRate)
      : this.departmentStats.map(d => d.attendancePerformanceRate);

    const metricLabel = this.selectedPerformanceType === 'academic' 
      ? 'Average Marks (%)' 
      : 'Attendance Rate (%)';

    this.createDepartmentPerformanceChart(this.departmentStats, performanceData, metricLabel);
  }
  private updatePerformanceLevelChart() {
    if (!this.departmentStats.length) return;

    const performanceLevels = this.departmentStats.map(d => 
      this.selectedPerformanceType === 'academic' 
        ? d.academicPerformanceLevel 
        : d.attendancePerformanceLevel
    );

    const levelCounts = {
      High: performanceLevels.filter(l => l === 'High').length,
      Medium: performanceLevels.filter(l => l === 'Medium').length,
      Low: performanceLevels.filter(l => l === 'Low').length
    };

    const data: ChartData = {
      labels: ['High Performance', 'Medium Performance', 'Low Performance'],
      datasets: [{
        data: [levelCounts.High, levelCounts.Medium, levelCounts.Low],
        backgroundColor: [
          this.CHART_COLORS.HIGH,
          this.CHART_COLORS.MEDIUM,
          this.CHART_COLORS.LOW
        ],
        borderWidth: 1
      }]
    };

    this.createPerformanceLevelChart(data);
  }
  private createDepartmentPerformanceChart(
    departmentData: DepartmentPerformance[],
    performanceData: number[],
    metricLabel: string
  ) {
    const canvas = document.getElementById('departmentPerformanceChart') as HTMLCanvasElement;
    if (!canvas) return;

    if (this.departmentPerformanceChart) {
      this.departmentPerformanceChart.destroy();
    }

    const color = this.selectedPerformanceType === 'academic' 
      ? this.CHART_COLORS.ACADEMIC 
      : this.CHART_COLORS.ATTENDANCE;

    this.departmentPerformanceChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: departmentData.map(d => d.name),
        datasets: [{
          label: metricLabel,
          data: performanceData,
          backgroundColor: color,
          borderColor: color,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            title: {
              display: true,
              text: metricLabel
            }
          },
          x: {
            title: {
              display: true,
              text: 'Departments'
            }
          }
        },
        plugins: {
          title: {
            display: true,
            text: `Department ${this.selectedPerformanceType === 'academic' ? 'Academic' : 'Attendance'} Performance`
          }
        }
      }
    });
  }
  private async presentToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'top',
      color: 'primary'
    });
    await toast.present();
  }
  private createPerformanceLevelChart(data: ChartData) {
  const canvas = document.getElementById('performanceLevelChart') as HTMLCanvasElement;
  if (!canvas) return;

  if (this.performanceLevelChart) {
    this.performanceLevelChart.destroy();
  }
  const highPerformanceDepartments = this.departmentStats
    .filter(dept => (this.selectedPerformanceType === 'academic' ? dept.academicPerformanceLevel : dept.attendancePerformanceLevel) === 'High')
    .map(dept => dept.name);
  const mediumPerformanceDepartments = this.departmentStats
    .filter(dept => (this.selectedPerformanceType === 'academic' ? dept.academicPerformanceLevel : dept.attendancePerformanceLevel) === 'Medium')
    .map(dept => dept.name);
  const lowPerformanceDepartments = this.departmentStats
    .filter(dept => (this.selectedPerformanceType === 'academic' ? dept.academicPerformanceLevel : dept.attendancePerformanceLevel) === 'Low')
    .map(dept => dept.name);
  this.performanceLevelChart = new Chart(canvas, {
    type: 'pie',
    data: data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 20,
            font: {
              size: 12
            }
          }
        },
        title: {
          display: true,
          text: `${this.selectedPerformanceType === 'academic' ? 'Academic' : 'Attendance'} Performance Distribution`,
          font: {
            size: 16,
            weight: 'bold'
          },
          padding: {
            top: 10,
            bottom: 30
          }
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const value = context.raw;
              const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${context.label}: ${value} (${percentage}%)`;
            }
          }
        }
      },
      onClick: async (event, elements) => {
        if (elements.length > 0) {
          const index = elements[0].index;
          let departments: string[] = [];
          let performanceLevel = '';
          switch (index) {
            case 0:
              departments = highPerformanceDepartments;
              performanceLevel = 'High';
              break;
            case 1:
              departments = mediumPerformanceDepartments;
              performanceLevel = 'Medium';
              break;
            case 2:
              departments = lowPerformanceDepartments;
              performanceLevel = 'Low';
              break;
          }
          const message = departments.length
            ? `${performanceLevel} Performance Departments:\n${departments.join(', ')}`
            : `No departments with ${performanceLevel} performance.`;
          await this.presentToast(message);
         }
       }
     }
   });
 }
}



