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

interface RangeStatistics {
  range: string;
  count: number;
  percentage: number;
  students: StudentMark[];
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
  private rangePieCharts: { [key: string]: Chart } = {};

  // Add missing properties
  selectedRange: string = 'all';
  rangeStatistics: RangeStatistics[] = [];
  ranges = [
    { label: 'All', value: 'all' },
    { label: '0 - 49%', value: '0-49' },
    { label: '50 - 74%', value: '50-74' },
    { label: '75 - 100%', value: '75-100' }
  ];

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
        const storedStaffData = localStorage.getItem('staffData');
        if (storedStaffData) {
          this.staffData = JSON.parse(storedStaffData);
          this.faculty = this.staffData?.faculty || '';
        } else {
          this.staffData = await this.authService.getLoggedInStaff();
          if (this.staffData) {
            localStorage.setItem('staffData', JSON.stringify(this.staffData));
            this.faculty = this.staffData.faculty;
          }
        }

        if (this.faculty) {
          await Promise.all([
            this.loadLecturerEmails(),
            this.loadStaffDetails()
          ]);
          await this.loadModuleData();
          this.updateViewBasedOnSelection();
        }
      }
    });
  }

  private updateViewBasedOnSelection() {
    switch (this.selectedView) {
      case 'all':
        this.showAllModules();
        break;
      case 'needingMentorship':
        this.showStudentsNeedingMentorship();
        break;
      default:
        this.showAllModules();
    }
  }
  showAllModules() {
    this.selectedView = 'all';
    this.filteredModules = [...this.allModules];
    this.updateChartsForAllModules();
  }
  private updateChartsForAllModules() {
    // Create department-based bar chart
    this.createModuleComparisonChart();
    
    // Create pie chart showing student distribution by department
    this.createDepartmentDistributionPieChart();
  }

  private createDepartmentDistributionPieChart() {
    const canvas = document.getElementById('departmentMentorshipChart') as HTMLCanvasElement;
    if (!canvas) return;

    if (this.departmentMentorshipChart) {
      this.departmentMentorshipChart.destroy();
    }

    // Group students by department
    const departmentCounts = new Map<string, number>();
    this.allModules.forEach(module => {
      const currentCount = departmentCounts.get(module.department) || 0;
      departmentCounts.set(module.department, currentCount + module.totalStudents);
    });

    const config: ChartConfiguration = {
      type: 'pie',
      data: {
        labels: Array.from(departmentCounts.keys()),
        datasets: [{
          data: Array.from(departmentCounts.values()),
          backgroundColor: Array.from(departmentCounts.keys()).map((_, index) => 
            `hsl(${(index * 360) / departmentCounts.size}, 70%, 50%)`)
        }]
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: 'Student Distribution by Department'
          },
          legend: {
            position: 'right'
          }
        }
      }
    };

    this.departmentMentorshipChart = new Chart(canvas, config);
  }

  howStudentsNeedingMentorship() {
    this.selectedView = 'needingMentorship';
    
    // Filter modules with students needing mentorship
    const modulesWithAtRiskStudents = this.allModules.filter(
      module => module.studentsNeedingMentorship > 0
    );
    
    this.filteredModules = modulesWithAtRiskStudents;
    this.updateChartsForMentorship();
  }
  private updateChartsForMentorship() {
    this.createModuleComparisonChart();
    this.createMentorshipPieChart();
  }
  private createMentorshipPieChart() {
    const canvas = document.getElementById('departmentMentorshipChart') as HTMLCanvasElement;
    if (!canvas) return;

    if (this.departmentMentorshipChart) {
      this.departmentMentorshipChart.destroy();
    }

    // Get students in selected range
    const [minRange, maxRange] = this.selectedRange === 'all' 
      ? [0, 100] 
      : this.selectedRange.split('-').map(Number);

    // Count students in range by department
    const departmentRangeCounts = new Map<string, number>();
    
    this.allModules.forEach(module => {
      if (module.studentsNeedingMentor) {
        const studentsInRange = module.studentsNeedingMentor.filter(student => {
          const avg = parseFloat(student.average);
          return avg >= minRange && avg <= maxRange;
        });

        const currentCount = departmentRangeCounts.get(module.department) || 0;
        departmentRangeCounts.set(module.department, currentCount + studentsInRange.length);
      }
    });

    const config: ChartConfiguration = {
      type: 'pie',
      data: {
        labels: Array.from(departmentRangeCounts.keys()),
        datasets: [{
          data: Array.from(departmentRangeCounts.values()),
          backgroundColor: Array.from(departmentRangeCounts.keys()).map((_, index) => 
            `hsl(${(index * 360) / departmentRangeCounts.size}, 70%, 50%)`)
        }]
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: `Students in ${this.selectedRange} Range by Department`
          },
          legend: {
            position: 'right'
          }
        }
      }
    };

    this.departmentMentorshipChart = new Chart(canvas, config);
  }
  onRangeChange(event: any) {
    this.selectedRange = event.detail.value;
    
    if (this.selectedView === 'needingMentorship') {
      // Filter modules based on the selected range
      const [minRange, maxRange] = this.selectedRange === 'all' 
        ? [0, 100] 
        : this.selectedRange.split('-').map(Number);

      this.filteredModules = this.allModules.filter(module => {
        if (!module.studentsNeedingMentor) return false;
        
        // Check if module has students in the selected range
        return module.studentsNeedingMentor.some(student => {
          const avg = parseFloat(student.average);
          return avg >= minRange && avg <= maxRange;
        });
      });

      this.updateChartsForMentorship();
    }
  }

  calculateRangeStatistics() {
    const allStudentMarks: StudentMark[] = [];
    
    // Collect all student marks across modules
    this.allModules.forEach(module => {
      if (module.studentsNeedingMentor) {
        allStudentMarks.push(...module.studentsNeedingMentor);
      }
    });

    // Calculate statistics for each range
    this.rangeStatistics = [
      this.calculateRangeData(allStudentMarks, 0, 49),
      this.calculateRangeData(allStudentMarks, 50, 74),
      this.calculateRangeData(allStudentMarks, 75, 100)
    ];
  }

  private calculateRangeData(marks: StudentMark[], min: number, max: number): RangeStatistics {
    const studentsInRange = marks.filter(student => {
      const avg = parseFloat(student.average);
      return avg >= min && avg <= max;
    });

    return {
      range: `${min} - ${max}`,
      count: studentsInRange.length,
      percentage: (studentsInRange.length / marks.length) * 100,
      students: studentsInRange
    };
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
      return;
    }
  
    // Create workbook
    const wb = XLSX.utils.book_new();
  
    // Add title worksheet
    const titleData = [
      [`Faculty Performance Report: ${this.faculty}`],
      [`Generated on: ${new Date().toLocaleDateString()}`],
      [], // Empty row for spacing
    ];
    const titleWS = XLSX.utils.aoa_to_sheet(titleData);
    XLSX.utils.book_append_sheet(wb, titleWS, 'Cover');
  
    // Process students needing mentorship
    const modulesWithAtRiskStudents = new Map<string, {
      moduleCode: string,
      moduleName: string,
      students: {
        studentNumber: number,
        average: string,
        tests: { [key: string]: number | string }
      }[]
    }>();
  
    // Collect all at-risk students from modules
    this.allModules.forEach(module => {
      if (module.studentsNeedingMentor && module.studentsNeedingMentor.length > 0) {
        modulesWithAtRiskStudents.set(module.moduleCode, {
          moduleCode: module.moduleCode,
          moduleName: module.moduleName,
          students: module.studentsNeedingMentor.map(student => ({
            studentNumber: student.studentNumber,
            average: student.average,
            tests: {
              ['test1']: student['test1'],
              ['test2']: student['test2'],
              ['test3']: student['test3'],
              ['test4']: student['test4'],
              ['test5']: student['test5'],
              ['test6']: student['test6'],
              ['test7']: student['test7']
            }
          }))
        });
      }
    });
  
    // Create At Risk Students Detail sheet
    const atRiskDetailData: any[] = [];
    let totalAtRiskStudents = 0;
  
    modulesWithAtRiskStudents.forEach((moduleData, moduleCode) => {
      // Add module header
      atRiskDetailData.push([]);
      atRiskDetailData.push([
        `Module: ${moduleData.moduleCode} - ${moduleData.moduleName}`,
        `Total Students at Risk: ${moduleData.students.length}`
      ]);
      atRiskDetailData.push([
        'Student Number',
        'Average',
        'Test 1',
        'Test 2',
        'Test 3',
        'Test 4',
        'Test 5',
        'Test 6',
        'Test 7'
      ]);
  
      // Add student details
      moduleData.students.forEach(student => {
        atRiskDetailData.push([
          student.studentNumber,
          `${student.average}%`,
          `${student.tests['test1'] || 'N/A'}%`,
          `${student.tests['test2'] || 'N/A'}%`,
          `${student.tests['test3'] || 'N/A'}%`,
          `${student.tests['test4'] || 'N/A'}%`,
          `${student.tests['test5'] || 'N/A'}%`,
          `${student.tests['test6'] || 'N/A'}%`,
          `${student.tests['test7'] || 'N/A'}%`
        ]);
        totalAtRiskStudents++;
      });
  
      // Add spacing between modules
      atRiskDetailData.push([]);
    });
  
    // Create At Risk Details worksheet
    if (atRiskDetailData.length > 0) {
      const atRiskDetailWS = XLSX.utils.aoa_to_sheet(atRiskDetailData);
      
      // Set column widths
      atRiskDetailWS['!cols'] = [
        { wch: 15 },  // Student Number
        { wch: 10 },  // Average
        { wch: 10 },  // Test 1
        { wch: 10 },  // Test 2
        { wch: 10 },  // Test 3
        { wch: 10 },  // Test 4
        { wch: 10 },  // Test 5
        { wch: 10 },  // Test 6
        { wch: 10 }   // Test 7
      ];
      
      XLSX.utils.book_append_sheet(wb, atRiskDetailWS, 'Students At Risk Detail');
    }

    // Create All Students worksheet
    const allStudentsData: any[] = [
      ['All Students in Faculty'],
      [],
      ['Student Number', 'Name', 'Department', 'Email', ]
    ];

    // Add all students with their risk status
    this.allStudents.forEach(student => {
      // Check if student is at risk in any module
      const atRiskModules: string[] = [];
      modulesWithAtRiskStudents.forEach((moduleData) => {
        if (moduleData.students.some(s => s.studentNumber === student.studentNumber)) {
          atRiskModules.push(moduleData.moduleCode);
        }
      });

      allStudentsData.push([
        student.studentNumber,
        student.name,
        student.department || 'N/A',
        student.email || 'N/A',
        //atRiskModules.length > 0 ? `At Risk in: ${atRiskModules.join(', ')}` : 'Good Standing'
      ]);
    });

    const allStudentsWS = XLSX.utils.aoa_to_sheet(allStudentsData);
    
    // Set column widths for all students sheet
    allStudentsWS['!cols'] = [
      { wch: 15 },  // Student Number
      { wch: 25 },  // Name
      { wch: 20 },  // Department
      { wch: 30 },  // Email
     // { wch: 40 }   // Risk Status
    ];
    
    XLSX.utils.book_append_sheet(wb, allStudentsWS, 'All Students');
  
    // Add summary sheet
    const summaryData = [
      ['Performance Summary'],
      [],
      ['Category', 'Count', 'Percentage'],
      ['Total Students Needing Mentorship', totalAtRiskStudents, 
       `${((totalAtRiskStudents / this.allStudents.length) * 100).toFixed(1)}%`],
      ['Total Students', this.allStudents.length, '100%'],
      [],
      ['Modules with At-Risk Students', modulesWithAtRiskStudents.size],
      [],
      ['Module Breakdown:'],
      ...Array.from(modulesWithAtRiskStudents.values()).map(module => [
        `${module.moduleCode} - ${module.moduleName}`,
        module.students.length,
        `${((module.students.length / this.allStudents.length) * 100).toFixed(1)}%`
      ]),
      [],
      ['* At Risk: Students with module averages below 50%']
    ];
      
    const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWS, 'Summary');
  
    // Generate and download Excel file
    const fileName = `${this.faculty}_students_report_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
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

        moduleData.push(...modulesMentorshipData.filter(module => module !== null));
      }
    }

    // Store all modules
    this.allModules = [...moduleData];
    // Filter low performing modules
    this.lowPerformingModules = moduleData.filter(module => 
      module.averageMarks < this.LOW_PERFORMANCE_THRESHOLD
    );
    // Set filtered modules to show all by default
    this.filteredModules = [...moduleData];
    
    // Calculate total students needing mentorship
    this.totalStudentsNeedingMentorship = moduleData.reduce(
      (sum, module) => sum + module.studentsNeedingMentorship, 0
    );

    // Calculate range statistics
    this.calculateRangeStatistics();

    // Update charts after a brief delay to ensure DOM is ready
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