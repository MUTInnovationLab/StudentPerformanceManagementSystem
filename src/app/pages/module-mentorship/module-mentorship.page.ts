// module-mentorship.page.ts
import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Chart, ChartConfiguration, ChartData } from 'chart.js';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AuthenticationService } from '../../services/auths.service';
import { AttendanceService } from '../../services/attendance.service';
import { AcademicService } from '../../services/academic.service';
import { Faculty, Department } from 'src/app/models/faculty.model';
import { ModalController } from '@ionic/angular';
import { AngularFireAuth } from '@angular/fire/compat/auth';;
import * as XLSX from 'xlsx'; // Add XLSX import

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

interface StudentDetails {
  id?: string;
  studentNumber: number;
  name: string;
  faculty: string;
  department?: string;
  email?: string;
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
  selectedView: 'all' | 'lowPerforming' | 'needingMentorship' | 'allStudents' = 'all';
  staffDetails: Map<string, StaffDetails> = new Map();
  selectedModule: ModuleMentorshipData | null = null;
  showStudentList: boolean = false;
  staffData: StaffDetails | null = null;
  totalStudents: number = 0;
  allStudents: any[] = [];
  allModules: ModuleMentorshipData[] = [];
 


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
    private modalController: ModalController,
    private afAuth: AngularFireAuth
  ) {
    this.afAuth.setPersistence('local');
  }

  async ngOnInit() {
    this.afAuth.onAuthStateChanged(async (user) => {
      if (user) {
        // Try to get staff data from local storage first
        const storedStaffData = localStorage.getItem('staffData');
        if (storedStaffData) {
          this.staffData = JSON.parse(storedStaffData);
          this.faculty = this.staffData?.faculty || '';
        } else {
          // If no local storage, fetch from authentication service
          this.staffData = await this.authService.getLoggedInStaff();
          if (this.staffData) {
            localStorage.setItem('staffData', JSON.stringify(this.staffData));
            this.faculty = this.staffData.faculty;
          }
        }

        if (this.faculty) {
          // Load data in parallel
          await Promise.all([
            this.loadLecturerEmails(), 
            this.loadStaffDetails()
          ]);
          await this.loadModuleData();
        }
      } else {
        console.error('No user logged in');
      }
    });
  }




  showAllStudents() {
    this.selectedView = 'allStudents';
    this.filteredModules = []; // Clear module filters

    // Generate Excel file immediately
    if (this.allStudents.length > 0) {
      this.generateFacultyStudentsExcel();
    }
  }


  generateFacultyStudentsExcel() {
    if (this.allStudents.length === 0) {
      return; // Silently exit if no students
    }
  
    // Create a map to track student's module risks with averages
    const studentRisks = new Map<number, Array<{ moduleCode: string; average: number }>>();
  
    // First pass: Collect all modules where students have low performance
    this.allModules.forEach(module => {
      module.studentsNeedingMentor?.forEach(studentMark => {
        const studentNumber = studentMark.studentNumber;
        const moduleCode = module.moduleCode.trim();
        
        // Get the calculated average for this student in this module
        const average = parseFloat(studentMark.average);
  
        // Only track if average is below 50%
        if (average < 50) {
          if (!studentRisks.has(studentNumber)) {
            studentRisks.set(studentNumber, []);
          }
          
          const studentModules = studentRisks.get(studentNumber)!;
          
          // Check if module already exists for this student
          const existingModule = studentModules.find(m => m.moduleCode === moduleCode);
          
          if (!existingModule) {
            studentModules.push({
              moduleCode: moduleCode,
              average: average
            });
            studentRisks.set(studentNumber, studentModules);
          }
        }
      });
    });
  
    // Generate Excel data with detailed risk status
    const excelData = this.allStudents.map(student => {
      // Get all risk modules for this student
      const riskModules = studentRisks.get(student.studentNumber) || [];
      
      // Sort modules by code for consistent display
      riskModules.sort((a, b) => a.moduleCode.localeCompare(b.moduleCode));
  
      // Create status string with module codes and averages
      const status = riskModules.length > 0
        ? `Risk in: ${riskModules.map(m => 
            `${m.moduleCode}(${m.average.toFixed(1)}%)`
          ).join(', ')}`
        : 'No Risk'; // Or '' if you prefer empty for no risk
  
      return {
        'Student Number': student.studentNumber,
        'Name': student.name.split(' ')[0],
        'Surname': student.surname.split(' ').slice(1).join(' ') || student.surname.split(' ')[0],
        'Email': student.email || 'N/A',
        'Department': student.department || 'N/A',
        'Total Risk Modules': riskModules.length,
        'Status': status
      };
    });
  
    // Sort the data by number of risk modules (descending) then by student number
    excelData.sort((a, b) => {
      if (b['Total Risk Modules'] !== a['Total Risk Modules']) {
        return b['Total Risk Modules'] - a['Total Risk Modules'];
      }
      return a['Student Number'] - b['Student Number'];
    });
  
    // Create worksheet with custom column widths
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(excelData);
    
    // Set column widths for better readability
    ws['!cols'] = [
      { wch: 15 },  // Student Number
      { wch: 15 },  // Name
      { wch: 20 },  // Surname
      { wch: 30 },  // Email
      { wch: 20 },  // Department
      { wch: 15 },  // Total Risk Modules
      { wch: 50 }   // Status
    ];
  
    // Create workbook and add the worksheet
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Faculty Students');
  
    // Generate Excel file
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
  
    // Download the file
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.faculty}_students_at_risk.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  }




  private async loadModuleData() {
    this.isLoading = true;
    try {
      const facultyDoc = await this.firestore.doc<Faculty>(`faculties/${this.faculty}`).get().toPromise();
      if (facultyDoc?.exists) {
        const faculty = facultyDoc.data() as Faculty;
        await this.processModuleData(faculty);
        await this.loadTotalStudents(faculty);
      }
    } catch (error) {
      console.error('Error loading faculty data:', error);
    } finally {
      this.isLoading = false;
    }
  }


  
  
private async loadTotalStudents(faculty: Faculty) {
  try {
    const studentsSnapshot = await this.firestore
      .collection('students', ref => ref.where('faculty', '==', this.faculty))
      .get()
      .toPromise();

    this.totalStudents = studentsSnapshot?.docs.length || 0;
      
    // Explicitly type the mapping
    this.allStudents = studentsSnapshot?.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as StudentDetails
    })) || [];

  } catch (error) {
    console.error('Error loading total students:', error);
    this.totalStudents = 0;
    this.allStudents = [];
  }
}


private async processModuleData(faculty: Faculty) {
  this.isLoading = true;
  const departments = faculty.departments || [];
  const moduleData: ModuleMentorshipData[] = [];

  try {
    for (const dept of departments) {
      const modules = this.getAllModulesFromDepartment(dept);
      
      if (modules.length === 0) continue;

      const [academicPerformance, attendancePerformance] = await Promise.all([
        this.academicService.getModuleAcademicPerformance(modules),
        this.attendanceService.getModuleAttendancePerformance(modules)
      ]);

      const CHUNK_SIZE = 5;
      const moduleChunks = this.chunkArray(modules, CHUNK_SIZE);

      for (const moduleChunk of moduleChunks) {
        const modulesMentorshipData = await Promise.all(
          moduleChunk.map(async (module) => {
            const academic = academicPerformance.find(ap => ap.moduleCode === module.moduleCode);
            const attendance = attendancePerformance.find(ap => ap.moduleCode === module.moduleCode);

            const marksDoc = await this.firestore
              .collection('marks')
              .doc(module.moduleCode)
              .get()
              .toPromise();

            const marksData = marksDoc?.data() as { 
              marks: StudentMark[], 
              testPercentages: { [key: string]: number } 
            } | undefined;

            let studentsNeedingMentor: StudentMark[] = [];
            let averageMarks = 0;

            if (marksData && marksData.marks) {
              // Calculate and update each student's average
              studentsNeedingMentor = marksData.marks.map(student => {
                const calculatedAverage = this.calculateStudentAverage(student, marksData.testPercentages);
                // Update the student's average in the mark object
                return {
                  ...student,
                  average: calculatedAverage.toFixed(1) // Store as string with 1 decimal place
                };
              }).filter(student => parseFloat(student.average) < this.LOW_PERFORMANCE_THRESHOLD);

              // Calculate overall module average
              averageMarks = marksData.marks.reduce((sum, student) => {
                const studentAvg = this.calculateStudentAverage(student, marksData.testPercentages);
                return sum + studentAvg;
              }, 0) / marksData.marks.length;

              // Update the marks in Firestore with new averages
              await this.firestore.collection('marks').doc(module.moduleCode).update({
                marks: marksData.marks.map(student => ({
                  ...student,
                  average: this.calculateStudentAverage(student, marksData.testPercentages).toFixed(1)
                }))
              });
            }

            const lecturerEmail = this.getLecturerEmail(module.moduleCode);
            const lecturerDetails = this.staffDetails.get(lecturerEmail.toLowerCase());

            return {
              moduleCode: module.moduleCode,
              moduleName: module.moduleName,
              lecturer: module.lecturer || 'Not Assigned',
              lecturerEmail: lecturerEmail,
              lecturerDetails: lecturerDetails,
              averageMarks: academic?.averageMarks || averageMarks,
              averageAttendance: attendance?.averageAttendance || 0,
              totalStudents: academic?.totalStudents || (marksData?.marks?.length || 0),
              studentsNeedingMentorship: studentsNeedingMentor.length,
              department: dept.name,
              studentsNeedingMentor: studentsNeedingMentor
            } as ModuleMentorshipData;
          })
        );

        moduleData.push(...modulesMentorshipData.filter(module => module !== null) as ModuleMentorshipData[]);
      }
    }

    this.allModules = [...moduleData];
    this.lowPerformingModules = moduleData.filter(module => module.averageMarks < this.LOW_PERFORMANCE_THRESHOLD);
    this.filteredModules = [...moduleData];
    this.totalStudentsNeedingMentorship = moduleData.reduce(
      (sum, module) => sum + module.studentsNeedingMentorship, 0
    );

    setTimeout(() => {
      this.updateCharts();
    }, 0);

  } catch (error) {
    console.error('Error processing module data:', error);
  } finally {
    this.isLoading = false;
  }
}

private calculateStudentAverage(mark: StudentMark, testPercentages: { [key: string]: number }): number {
  let totalWeightedScore = 0;
  let totalWeight = 0;

  // Process each test, handling both number and string values
  for (let i = 1; i <= 7; i++) {
    const testKey = `test${i}` as keyof StudentMark;
    const testScore = mark[testKey];
    const weight = testPercentages[testKey];

    // Convert test score to number if it's a string
    const score = typeof testScore === 'string' ? parseFloat(testScore) : testScore;

    // Only include valid scores and weights in calculation
    if (!isNaN(score) && score !== null && weight && weight > 0) {
      totalWeightedScore += (score * weight);
      totalWeight += weight;
    }
  }

  // Return calculated average or 0 if no valid scores
  return totalWeight > 0 ? (totalWeightedScore / totalWeight) : 0;
}

private chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
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

  private async ensureUserAuthentication() {
    const user = await this.afAuth.currentUser;
    if (!user) {
      // Redirect to login or handle unauthenticated state
      console.error('User not authenticated');
      return false;
    }
    return true;
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