import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Chart, ChartConfiguration, ChartData } from 'chart.js';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AuthenticationService } from '../../services/auths.service';
import { AttendanceService } from '../../services/attendance.service';
import { AcademicService } from '../../services/academic.service';
import { Faculty, Department } from 'src/app/models/faculty.model';

// Update the Module interface to include lecturer and moduleLevel
interface Module {
  moduleCode: string;
  moduleName: string;
  lecturer?: string;  // Made optional since it might not always be present
  moduleLevel: string; // Include the moduleLevel property
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
}
interface LecturerData {
  userEmail: string;
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
  searchQuery: string = ''; // Search query for department filter

  private readonly LOW_PERFORMANCE_THRESHOLD = 50;
  private readonly CHART_COLORS = {
    MARKS: '#ef4444',      // Red for marks
    ATTENDANCE: '#3b82f6', // Blue for attendance
    BACKGROUND: '#f3f4f6'  // Light gray background
  };

  constructor(
    private firestore: AngularFirestore,
    private authService: AuthenticationService,
    private attendanceService: AttendanceService,
    private academicService: AcademicService
  ) {}

  async ngOnInit() {
    const user = await this.authService.getLoggedInStaff();
    if (user) {
      this.faculty = user.faculty;
      await this.loadModuleData();
    }
  }

  ngAfterViewInit() {
    if (this.lowPerformingModules.length > 0) {
      this.updateCharts();
    }
  }

  private async getLecturerEmail(moduleCode: string): Promise<string | null> {
    try {
      const lecturerDoc = await this.firestore.collection('assignedLectures', ref => 
        ref.where('modules.moduleCode', '==', moduleCode)
      ).get().toPromise();
      
      // Check if lecturerDoc is not empty
      if (lecturerDoc && !lecturerDoc.empty) {
        // Cast to the correct type using the interface
        const lecturerData = lecturerDoc.docs[0].data() as LecturerData;
        return lecturerData.userEmail || null;
      }
    } catch (error) {
      console.error('Error fetching lecturer email:', error);
    }
    return null;
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

          moduleData.push({
            moduleCode: modules[i].moduleCode,
            moduleName: modules[i].moduleName,
            lecturer: modules[i].lecturer || 'Not Assigned',
            averageMarks: academic.averageMarks,
            averageAttendance: attendance?.averageAttendance || 0,
            totalStudents: academic.totalStudents,
            studentsNeedingMentorship,
            department: dept.name
          });
        }
      }
    }

    // Filter the modules with average marks < 50% (pass rate less than 50%)
    this.lowPerformingModules = moduleData.filter(module => module.averageMarks < 50);
    this.filteredModules = this.lowPerformingModules;

    // Calculate total students needing mentorship from the low performing modules
    this.totalStudentsNeedingMentorship = this.lowPerformingModules.reduce(
      (sum, module) => sum + module.studentsNeedingMentorship, 0
    );
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

  // Function to filter modules based on search query
  filterModules() {
    this.filteredModules = this.lowPerformingModules.filter(module => 
      module.department.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  }
}
