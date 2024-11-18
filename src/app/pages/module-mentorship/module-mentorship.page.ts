// module-mentorship.page.ts
import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Chart, ChartConfiguration, ChartData } from 'chart.js';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AuthenticationService } from '../../services/auths.service';
import { AttendanceService } from '../../services/attendance.service';
import { AcademicService } from '../../services/academic.service';
import { Faculty, Department } from 'src/app/models/faculty.model';
import { ModalController } from '@ionic/angular';

interface Module {
  moduleCode: string;
  moduleName: string;
  lecturer?: string;
  moduleLevel: string;
}

interface StaffDetails {
  fullName: string;
  department: string;
  staffNumber: string;
  email: string;
  faculty: string;
  position: string;
}


interface ModuleMentorshipData {
  moduleCode: string;
  moduleName: string;
  lecturer: string;
  averageMarks: number;
  averageAttendance: number;
  totalStudents: number;
  studentsNeedingMentorship: number;
  department: string;
  lecturerEmail: string;
  lecturerDetails?: StaffDetails;
}

interface AssignedModule {
  moduleCode: string;
  userEmail: string;
  department: string;
  faculty: string;
  moduleLevel: string;
  moduleName: string;
  scannerOpenCount: number;
}

@Component({
  selector: 'app-module-mentorship',
  templateUrl: './module-mentorship.page.html',
  styleUrls: ['./module-mentorship.page.scss']
})
export class ModuleMentorshipPage implements OnInit, AfterViewInit {
  lowPerformingModules: ModuleMentorshipData[] = [];
  filteredModules: ModuleMentorshipData[] = [];
  totalStudentsNeedingMentorship: number = 0;
  moduleComparisonChart: Chart | null = null;
  departmentMentorshipChart: Chart | null = null;
  isLoading: boolean = true;
  faculty: string = '';
  searchQuery: string = '';
  lecturerEmails: Map<string, string> = new Map();
  selectedView: 'all' | 'lowPerforming' | 'needingMentorship' = 'all';
  staffDetails: Map<string, StaffDetails> = new Map();

  private readonly LOW_PERFORMANCE_THRESHOLD = 50;
  private readonly CHART_COLORS = {
    MARKS: '#ef4444',
    ATTENDANCE: '#3b82f6',
    BACKGROUND: '#f3f4f6'
  };

  constructor(
    private firestore: AngularFirestore,
    private authService: AuthenticationService,
    private attendanceService: AttendanceService,
    private academicService: AcademicService,
    private modalController: ModalController
  ) {}

  async ngOnInit() {
    try {
      const user = await this.authService.getLoggedInStaff();
      if (user) {
        this.faculty = user.faculty;
        await this.loadLecturerEmails();
        await this.loadStaffDetails(); // Add this line
        await this.loadModuleData();
      }
    } catch (error) {
      console.error('Error in ngOnInit:', error);
    }
  }

  // Add new method to load staff details
  private async loadStaffDetails() {
    try {
      const staffSnapshot = await this.firestore
        .collection('staff')
        .get()
        .toPromise();

      if (staffSnapshot) {
        staffSnapshot.docs.forEach(doc => {
          const staffData = doc.data() as StaffDetails;
          if (staffData.email) {
            this.staffDetails.set(staffData.email.toLowerCase(), staffData);
          }
        });
      }
      console.log('Loaded staff details:', this.staffDetails);
    } catch (error) {
      console.error('Error loading staff details:', error);
    }
  }

  private async processModuleData(faculty: Faculty) {
    const departments = faculty.departments || [];
    const moduleData: ModuleMentorshipData[] = [];

    for (const dept of departments) {
      const modules = this.getAllModulesFromDepartment(dept);
      const [academicPerformance, attendancePerformance] = await Promise.all([
        this.academicService.getModuleAcademicPerformance(modules),
        this.attendanceService.getModuleAttendancePerformance(modules)
      ]);

      for (let i = 0; i < modules.length; i++) {
        const academic = academicPerformance.find(ap => ap.moduleCode === modules[i].moduleCode);
        const attendance = attendancePerformance.find(ap => ap.moduleCode === modules[i].moduleCode);

        if (academic && academic.averageMarks < this.LOW_PERFORMANCE_THRESHOLD) {
          const studentsNeedingMentorship = Math.round((academic.totalStudents *
            (this.LOW_PERFORMANCE_THRESHOLD - academic.averageMarks)) / 100);

          const lecturerEmail = this.getLecturerEmail(modules[i].moduleCode);
          const lecturerDetails = this.staffDetails.get(lecturerEmail.toLowerCase());

          moduleData.push({
            moduleCode: modules[i].moduleCode,
            moduleName: modules[i].moduleName,
            lecturer: modules[i].lecturer || 'Not Assigned',
            lecturerEmail: lecturerEmail,
            lecturerDetails: lecturerDetails, // Add lecturer details
            averageMarks: academic.averageMarks,
            averageAttendance: attendance?.averageAttendance || 0,
            totalStudents: academic.totalStudents,
            studentsNeedingMentorship,
            department: dept.name
          });
        }
      }
    }

    this.lowPerformingModules = moduleData.filter(module => module.averageMarks < 50);
    this.filteredModules = [...this.lowPerformingModules];
    this.totalStudentsNeedingMentorship = this.lowPerformingModules.reduce(
      (sum, module) => sum + module.studentsNeedingMentorship, 0
    );

    setTimeout(() => {
      this.updateCharts();
    }, 0);
  }
  ngAfterViewInit() {
    if (this.lowPerformingModules.length > 0) {
      this.updateCharts();
    }
  }

  private async loadLecturerEmails() {
    try {
      const assignedLecturesSnapshot = await this.firestore
        .collection('assignedLectures')
        .get()
        .toPromise();

      if (assignedLecturesSnapshot) {
        assignedLecturesSnapshot.docs.forEach(doc => {
          const data = doc.data() as { modules: AssignedModule[] };
          if (data && data.modules) {
            data.modules.forEach(module => {
              this.lecturerEmails.set(module.moduleCode.trim(), module.userEmail);
            });
          }
        });
      }
      console.log('Loaded lecturer emails:', this.lecturerEmails);
    } catch (error) {
      console.error('Error loading lecturer emails:', error);
    }
  }

  private getLecturerEmail(moduleCode: string): string {
    return this.lecturerEmails.get(moduleCode.trim()) || 'Not Assigned';
  }

  private async loadModuleData() {
    this.isLoading = true;
    try {
      const facultyDoc = await this.firestore.doc<Faculty>(`faculties/${this.faculty}`).get().toPromise();
      if (facultyDoc?.exists) {
        const faculty = facultyDoc.data() as Faculty;
        await this.processModuleData(faculty);
      }
    } catch (error) {
      console.error('Error loading faculty data:', error);
    } finally {
      this.isLoading = false;
    }
  }
/*
  private async processModuleData(faculty: Faculty) {
    const departments = faculty.departments || [];
    const moduleData: ModuleMentorshipData[] = [];

    for (const dept of departments) {
      const modules = this.getAllModulesFromDepartment(dept);
      const [academicPerformance, attendancePerformance] = await Promise.all([
        this.academicService.getModuleAcademicPerformance(modules),
        this.attendanceService.getModuleAttendancePerformance(modules)
      ]);

      for (let i = 0; i < modules.length; i++) {
        const academic = academicPerformance.find(ap => ap.moduleCode === modules[i].moduleCode);
        const attendance = attendancePerformance.find(ap => ap.moduleCode === modules[i].moduleCode);

        if (academic && academic.averageMarks < this.LOW_PERFORMANCE_THRESHOLD) {
          const studentsNeedingMentorship = Math.round((academic.totalStudents *
            (this.LOW_PERFORMANCE_THRESHOLD - academic.averageMarks)) / 100);

          const lecturerEmail = this.getLecturerEmail(modules[i].moduleCode);

          moduleData.push({
            moduleCode: modules[i].moduleCode,
            moduleName: modules[i].moduleName,
            lecturer: modules[i].lecturer || 'Not Assigned',
            lecturerEmail: lecturerEmail,
            averageMarks: academic.averageMarks,
            averageAttendance: attendance?.averageAttendance || 0,
            totalStudents: academic.totalStudents,
            studentsNeedingMentorship,
            department: dept.name
          });
        }
      }
    }

    this.lowPerformingModules = moduleData.filter(module => module.averageMarks < 50);
    this.filteredModules = [...this.lowPerformingModules];
    this.totalStudentsNeedingMentorship = this.lowPerformingModules.reduce(
      (sum, module) => sum + module.studentsNeedingMentorship, 0
    );

    setTimeout(() => {
      this.updateCharts();
    }, 0);
  }
*/
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

  private updateCharts() {
    this.createModuleComparisonChart();
    this.createDepartmentMentorshipChart();
  }

  private createModuleComparisonChart() {
    const canvas = document.getElementById('moduleComparisonChart') as HTMLCanvasElement;
    if (!canvas) return;

    if (this.moduleComparisonChart) {
      this.moduleComparisonChart.destroy();
    }

    const labels = this.filteredModules.map(m => m.moduleCode);
    const marksData = this.filteredModules.map(m => m.averageMarks);
    const attendanceData = this.filteredModules.map(m => m.averageAttendance);

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Marks',
            data: marksData,
            backgroundColor: this.CHART_COLORS.MARKS
          },
          {
            label: 'Attendance',
            data: attendanceData,
            backgroundColor: this.CHART_COLORS.ATTENDANCE
          }
        ]
      }
    };

    this.moduleComparisonChart = new Chart(canvas, config);
  }

  private createDepartmentMentorshipChart() {
    const canvas = document.getElementById('departmentMentorshipChart') as HTMLCanvasElement;
    if (!canvas) return;

    if (this.departmentMentorshipChart) {
      this.departmentMentorshipChart.destroy();
    }

    const departmentNames = [...new Set(this.filteredModules.map(m => m.department))];
    const mentorshipCounts = departmentNames.map(deptName => 
      this.filteredModules.filter(m => m.department === deptName).reduce(
        (sum, module) => sum + module.studentsNeedingMentorship, 0
      )
    );

    const config: ChartConfiguration = {
      type: 'pie',
      data: {
        labels: departmentNames,
        datasets: [{
          data: mentorshipCounts,
          backgroundColor: departmentNames.map((_, index) => 
            `hsl(${(index * 360) / departmentNames.length}, 100%, 50%)`)
        }]
      }
    };

    this.departmentMentorshipChart = new Chart(canvas, config);
  }

  showLowPerformingModules() {
    this.selectedView = 'lowPerforming';
    this.filteredModules = [...this.lowPerformingModules];
    this.updateCharts();
  }

  showStudentsNeedingMentorship() {
    this.selectedView = 'needingMentorship';
    this.filteredModules = this.lowPerformingModules
      .filter(module => module.studentsNeedingMentorship > 0)
      .sort((a, b) => b.studentsNeedingMentorship - a.studentsNeedingMentorship);
    this.updateCharts();
  }

  resetView() {
    this.selectedView = 'all';
    this.filteredModules = [...this.lowPerformingModules];
    this.searchQuery = '';
    this.updateCharts();
  }

  filterModules() {
    let baseModules = [...this.lowPerformingModules];
    
    if (this.selectedView === 'lowPerforming') {
      baseModules = this.lowPerformingModules;
    } else if (this.selectedView === 'needingMentorship') {
      baseModules = this.lowPerformingModules.filter(
        module => module.studentsNeedingMentorship > 0
      );
    }

    if (!this.searchQuery.trim()) {
      this.filteredModules = baseModules;
    } else {
      this.filteredModules = baseModules.filter(module => 
        module.department.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    }
    this.updateCharts();
  }
}