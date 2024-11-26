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


interface StudentMark {
  studentNumber: number;
  average: string;
  test1: number;
  test2: number;
  test3: number;
  test4: number;
  test5: string;
  test6: string;
  test7: string;
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
  studentsNeedingMentor?: StudentMark[]; // Add this line
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
  selectedModule: ModuleMentorshipData | null = null;
  showStudentList: boolean = false;

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
  
        // Load data in parallel
        await Promise.all([this.loadLecturerEmails(), this.loadStaffDetails()]);
        await this.loadModuleData(); // Load modules after essential data
      }
    } catch (error) {
      console.error('Error in ngOnInit:', error);
    }
  }
  
  
  // Optimize data processing by parallelizing API calls
  async processModuleData(faculty: Faculty) {
    const departments = faculty.departments || [];
    const moduleData: ModuleMentorshipData[] = []; // This will store the final array
  
    // Loop through each department
    for (const dept of departments) {
      const modules = this.getAllModulesFromDepartment(dept); // Assume this method returns an array of modules
      const [academicPerformance, attendancePerformance] = await Promise.all([
        this.academicService.getModuleAcademicPerformance(modules), // Get academic performance data
        this.attendanceService.getModuleAttendancePerformance(modules) // Get attendance performance data
      ]);
  
      // Process each module
      const modulesMentorshipData = await Promise.all(
        modules.map(async (module) => {
          // Find corresponding academic and attendance data for each module
          const academic = academicPerformance.find(ap => ap.moduleCode === module.moduleCode);
          const attendance = attendancePerformance.find(ap => ap.moduleCode === module.moduleCode);
  
          if (academic && academic.averageMarks < this.LOW_PERFORMANCE_THRESHOLD) {
            // If average marks are below threshold, get additional data
            const marksDoc = await this.firestore
              .collection('marks')
              .doc(module.moduleCode)
              .get()
              .toPromise();
  
            const marksData = marksDoc?.data() as { marks: StudentMark[] } | undefined;
            const studentsNeedingMentor = marksData?.marks.filter(
              student => parseFloat(student.average) < this.LOW_PERFORMANCE_THRESHOLD
            ) || [];
  
            // Get lecturer details
            const lecturerEmail = this.getLecturerEmail(module.moduleCode);
            const lecturerDetails = this.staffDetails.get(lecturerEmail.toLowerCase());
  
            // Return the ModuleMentorshipData object
            return {
              moduleCode: module.moduleCode,
              moduleName: module.moduleName,
              lecturer: module.lecturer || 'Not Assigned',
              lecturerEmail: lecturerEmail,
              lecturerDetails: lecturerDetails,
              averageMarks: academic.averageMarks,
              averageAttendance: attendance?.averageAttendance || 0,
              totalStudents: academic.totalStudents,
              studentsNeedingMentorship: studentsNeedingMentor.length,
              department: dept.name,
              studentsNeedingMentor: studentsNeedingMentor
            } as ModuleMentorshipData; // Type assertion to ensure correct type
          }
  
          return null; // If module doesn't meet the condition, return null
        })
      );
  
      // Filter out null values from the results
      moduleData.push(...modulesMentorshipData.filter((module) => module !== null) as ModuleMentorshipData[]);
    }
  
    // Filter low-performing modules based on average marks
    this.lowPerformingModules = moduleData.filter(module => module.averageMarks < 50);
    this.filteredModules = [...this.lowPerformingModules]; // For UI filtering or additional handling
  
    // Calculate total students needing mentorship
    this.totalStudentsNeedingMentorship = this.lowPerformingModules.reduce(
      (sum, module) => sum + module.studentsNeedingMentorship, 0
    );
  
    setTimeout(() => {
      this.updateCharts(); // Update any relevant charts or UI
    }, 0);
  }
  
  
  // Process modules for a specific department
  private async processDepartmentModules(modules: Module[], departmentName: string): Promise<ModuleMentorshipData[]> {
    const [academicPerformance, attendancePerformance] = await Promise.all([
      this.academicService.getModuleAcademicPerformance(modules),
      this.attendanceService.getModuleAttendancePerformance(modules)
    ]);
  
    // Use Promise.all to handle the array of async results
    const modulesMentorshipData = await Promise.all(modules.map(async (module) => {
      const academic = academicPerformance.find(ap => ap.moduleCode === module.moduleCode);
      const attendance = attendancePerformance.find(ap => ap.moduleCode === module.moduleCode);
  
      if (!academic || academic.averageMarks >= this.LOW_PERFORMANCE_THRESHOLD) {
        return null; // Skip modules that are not low-performing
      }
  
      const marksDoc = await this.firestore.collection('marks').doc(module.moduleCode).get().toPromise();
      const marksData = marksDoc?.data() as { marks: StudentMark[] } | undefined;
      const studentsNeedingMentor = marksData?.marks.filter(
        student => parseFloat(student.average) < this.LOW_PERFORMANCE_THRESHOLD
      ) || [];
  
      const lecturerEmail = this.getLecturerEmail(module.moduleCode);
      const lecturerDetails = this.staffDetails.get(lecturerEmail.toLowerCase());
  
      return {
        moduleCode: module.moduleCode,
        moduleName: module.moduleName,
        lecturer: module.lecturer || 'Not Assigned',
        lecturerEmail: lecturerEmail,
        lecturerDetails: lecturerDetails,
        averageMarks: academic.averageMarks,
        averageAttendance: attendance?.averageAttendance || 0,
        totalStudents: academic.totalStudents,
        studentsNeedingMentorship: studentsNeedingMentor.length,
        department: departmentName,
        studentsNeedingMentor: studentsNeedingMentor
      } as ModuleMentorshipData;
    }));
  
    // Filter out null values from the result of Promise.all
    return modulesMentorshipData.filter(module => module !== null) as ModuleMentorshipData[];
  }
  
  
  // Ensure charts render only after data is loaded
  private updateCharts() {
    if (this.filteredModules.length > 0) {
      this.createModuleComparisonChart();
      this.createDepartmentMentorshipChart();
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

  
  async showModuleStudents(module: ModuleMentorshipData) {
    this.selectedModule = module;
    this.showStudentList = true;
  }

  hideStudentList() {
    this.showStudentList = false;
    this.selectedModule = null;
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