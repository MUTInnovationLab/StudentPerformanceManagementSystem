// student-management.page.ts
import { Component, OnInit } from '@angular/core';
import { Staff } from 'src/app/models/staff.model';
import { AuthenticationService } from '../../services/auths.service';
import { DataService } from 'src/app/services/data.service';
import {Module } from 'src/app/models/assignedModules.model';
import {  StudentMarks,  TestPercentages, ModuleMarksDocument, RiskCategory } from '../../models/studentsMarks.model';
// import { ModalController } from '@ionic/angular';
// import { AlertController, LoadingController,ToastController } from '@ionic/angular';
import { Student } from 'src/app/models/users.model';
import { Router } from '@angular/router';  // Add this import at the top

import { EmailService } from 'src/app/services/email.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';

// Add this interface at the top of the file
interface PerformanceCategory {
  range: string;
  count: number;
  students: StudentMarks[];
}

@Component({
  selector: 'app-student-management',
  templateUrl: './student-management.page.html',
  styleUrls: ['./student-management.page.scss'],
})
export class StudentManagementPage implements OnInit {
  // Change from private to public
  public readonly PERFORMANCE_THRESHOLDS = {
    DISTINCTION: 75,
    INTERMEDIATE: 60,
    PARTIAL: 50,
    AT_RISK: 0
  };

  // Add a getter for template usage
  get performanceLevels() {
    return [
      { value: 'ALL', label: 'All Performance Levels' },
      { value: this.PERFORMANCE_THRESHOLDS.DISTINCTION, label: 'Distinction (75% +)' },
      { value: this.PERFORMANCE_THRESHOLDS.INTERMEDIATE, label: 'Good Standing (60-74%)' },
      { value: this.PERFORMANCE_THRESHOLDS.PARTIAL, label: 'Partial Pass (50-59%)' },
      { value: this.PERFORMANCE_THRESHOLDS.AT_RISK, label: 'At Risk (Below 50%)' }
    ];
  }

  private readonly CHART_COLORS = {
    AT_RISK: '#ef4444',
    PARTIAL: '#f59e0b',
    INTERMEDIATE: '#3b82f6',
    DISTINCTION: '#22c55e'
  };

  menuVisible: boolean = false;

  attendanceSummary: any[] = [];
isAttendanceModalOpen = false;
  selectedModule = '';
  selectedRange = '0-40';
  selectedOrder = 'ascending';
  searchText = '';
  staff: Staff = {
    department: '',
    email: '',
    faculty: '',
    fullName: '',
    position: '',
    staffNumber: '',
  };

  modules: Module[] = [];
  studentMarks: StudentMarks[] = [];
  filteredStudents: StudentMarks[] = [];
  displayedMarks: (keyof StudentMarks)[] = [];
  testPercentages: TestPercentages | null = null;
  isModalOpen = false;
  availableMentors: any[] = [];
  selectedStudent: StudentMarks | null = null;
  selectedMentor: any; // Add this line
  isHOD: boolean = false;
  selectedRiskCategory: RiskCategory | 'ALL' = 'ALL';
  departmentModules: ModuleMarksDocument[] = [];

  studentDetails: Student={
    department: '',
    email: '',
    name: '',
    studentNumber: '',
    surname: ''
  }
  openSelectedStudent : boolean =false;
  fullstudentDetails:any;
  
  // Add this property to make RiskCategory available in the template
  RiskCategory = RiskCategory;

  // Add to existing properties
  selectedPerformance: number | 'ALL' = 'ALL';

  constructor(
    private authService: AuthenticationService,
    private router: Router,
    private auth: AuthenticationService,
    private dataService: DataService,
    private email : EmailService,
    private db: AngularFirestore
  ) {}

  openMenu() {
    this.menuVisible = !this.menuVisible;
  }
  goToCsv(){
    this.router.navigate(['/csv']);  // Ensure you have this route set up
    this.menuVisible = false;  // Hide the menu after selecting
  }
  goToStudentManagement(){
    this.router.navigate(['/student-management']);  // Ensure you have this route set up
    this.menuVisible = false;  // Hide the menu after selecting
  }
  goToStudentPerformance() {
    this.router.navigate(['/students-performance']);  // Ensure you have this route set up
    this.menuVisible = false;  // Hide the menu after selecting
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

  ngOnInit() {
    this.auth.getLoggedInStaff().then((staffData) => {
      this.staff = staffData;
      this.isHOD = staffData.position === 'HOD';
      
      if (this.isHOD) {
        this.loadDepartmentData(staffData.department);
      } else {
        this.loadLecturerData(staffData.staffNumber);
      }

      // Load modules for the logged-in staff
      this.dataService.getModulesByStaffNumber(staffData.staffNumber).subscribe(data => {
        this.modules = data;
        if (this.modules.length > 0) {
          this.selectedModule = this.modules[0].moduleCode;
          this.getModuleMarks(this.selectedModule);
        }
      });
    });
  }

  private async loadDepartmentData(department: string) {
    try {
      // Get faculty first
      const faculty = await this.auth.getLoggedInFaculty();
      
      // Get all department modules
      this.db.collection('faculties').doc(faculty)
        .get().subscribe(async (doc) => {
          if (doc.exists) {
            const facultyData = doc.data() as any;
            const deptData = facultyData.departments.find((d: any) => d.name === department);
            
            if (deptData) {
              // Collect all modules from department and streams
              let allModules: Module[] = [];
              
              // Add direct department modules
              if (deptData.modules) {
                allModules.push(...deptData.modules);
              }
              
              // Add modules from streams
              if (deptData.streams) {
                Object.values(deptData.streams).forEach((streams: any) => {
                  streams.forEach((stream: any) => {
                    if (stream.modules) {
                      allModules.push(...stream.modules);
                    }
                  });
                });
              }
              
              // Store modules
              this.modules = allModules;
              
              // Get marks for all modules
              const moduleMarksPromises = allModules.map(module => 
                this.dataService.getModuleMarks(module.moduleCode).toPromise()
              );
              
              const moduleMarksResults = await Promise.all(moduleMarksPromises);
              
              // Filter out null results and store
              this.departmentModules = moduleMarksResults.filter(result => result !== null) as ModuleMarksDocument[];
              
              // Process the data
              this.processAllModulesData();
            }
          }
        });
    } catch (error) {
      console.error('Error loading department data:', error);
      this.email.toastMessage('Error loading department data', 'danger', 'close-circle-outline', 'cancel');
    }
  }

  private loadLecturerData(staffNumber: string) {
    this.dataService.getModulesByStaffNumber(staffNumber).subscribe(data => {
      this.modules = data;
      if (this.modules.length > 0) {
        this.selectedModule = this.modules[0].moduleCode;
        this.getModuleMarks(this.selectedModule);
      }
    });
  }

  private processAllModulesData() {
    let performanceCategories: {
      atRisk: PerformanceCategory;
      partialPass: PerformanceCategory;
      intermediatePass: PerformanceCategory;
      distinction: PerformanceCategory;
    } = {
      atRisk: { range: '0-49', count: 0, students: [] },
      partialPass: { range: '50-59', count: 0, students: [] },
      intermediatePass: { range: '60-74', count: 0, students: [] },
      distinction: { range: '75-100', count: 0, students: [] }
    };

    // Reset student marks array
    this.studentMarks = [];

    // Process each module's marks
    this.departmentModules.forEach(moduleDoc => {
      moduleDoc.marks.forEach(mark => {
        // Add module code to student mark for reference
        const enrichedMark = {
          ...mark,
          moduleCode: moduleDoc.moduleCode,
          riskCategory: this.calculateRiskCategory(mark.average)
        };

        this.studentMarks.push(enrichedMark);

        // Categorize by performance
        if (mark.average >= this.PERFORMANCE_THRESHOLDS.DISTINCTION) {
          performanceCategories.distinction.count++;
          performanceCategories.distinction.students.push(enrichedMark);
        } else if (mark.average >= this.PERFORMANCE_THRESHOLDS.INTERMEDIATE) {
          performanceCategories.intermediatePass.count++;
          performanceCategories.intermediatePass.students.push(enrichedMark);
        } else if (mark.average >= this.PERFORMANCE_THRESHOLDS.PARTIAL) {
          performanceCategories.partialPass.count++;
          performanceCategories.partialPass.students.push(enrichedMark);
        } else {
          performanceCategories.atRisk.count++;
          performanceCategories.atRisk.students.push(enrichedMark);
        }
      });
    });

    // Update filtered students and apply initial filters
    this.filteredStudents = [...this.studentMarks];
    this.applyFilters();
  }

  filterByRiskCategory(category: RiskCategory | 'ALL') {
    this.selectedRiskCategory = category;
    this.applyFilters();
  }

  async openPerfomance() {
    try {
      if (!this.selectedModule) {
        this.email.toastMessage('Please select a module first', 'danger', 'close-circle-outline', 'cancel');
        return;
      }
  
      const attendanceRef = this.db.collection('Attended').doc(this.selectedModule);
      
      const doc = await attendanceRef.get().toPromise();
      
      if (!doc?.exists) {
        this.email.toastMessage('No attendance records found', 'warning', 'information-circle-outline', 'cancel');
        return;
      }
  
      const attendanceData = doc.data() || {};
      
      // Prepare attendance summary
      const attendanceSummary = Object.entries(attendanceData).map(([date, records]) => ({
        date,
        totalAttendees: records.length,
        attendeeDetails: records.reduce((acc: { [x: string]: any; }, record: { studentNumber: string | number; }) => {
          acc[record.studentNumber] = (acc[record.studentNumber] || 0) + 1;
          return acc;
        }, {})
      }));
  
      // Open modal to display attendance summary
      this.openAttendanceModal(attendanceSummary);
  
    } catch (error) {
      console.error('Error retrieving attendance:', error);
      this.email.toastMessage('Failed to retrieve attendance', 'danger', 'close-circle-outline', 'cancel');
    }
  }

  // async openPerfomance(studentNumber?: string) {
  //   try {
  //     if (!this.selectedModule) {
  //       this.email.toastMessage('Please select a module first', 'danger', 'close-circle-outline', 'cancel');
  //       return;
  //     }
  
  //     const attendanceRef = this.db.collection('Attended').doc(this.selectedModule);
      
  //     const doc = await attendanceRef.get().toPromise();
      
  //     if (!doc?.exists) {
  //       this.email.toastMessage('No attendance records found', 'warning', 'information-circle-outline', 'cancel');
  //       return;
  //     }
  
  //     const attendanceData = doc.data() || {};
      
  //     // If a specific student number is provided, filter attendance for that student
  //     if (studentNumber) {
  //       const studentAttendanceDetails = Object.entries(attendanceData)
  //         .map(([date, records]) => ({
  //           date,
  //           attendanceTime: records.find((record: any) => record.studentNumber === studentNumber)?.scanTime || ''
  //         }))
  //         .filter(record => record.attendanceTime);
  
  //       this.selectedStudentAttendance = {
  //         studentNumber,
  //         attendanceDetails: studentAttendanceDetails
  //       };
  //       this.isStudentAttendanceModalOpen = true;
  //     } else {
  //       // Original all-module attendance logic
  //       const attendanceSummary = Object.entries(attendanceData).map(([date, records]) => ({
  //         date,
  //         totalAttendees: records.length,
  //         attendeeDetails: records.reduce((acc: { [x: string]: any; }, record: { studentNumber: string | number; }) => {
  //           acc[record.studentNumber] = (acc[record.studentNumber] || 0) + 1;
  //           return acc;
  //         }, {})
  //       }));
  
  //       this.openAttendanceModal(attendanceSummary);
  //     }
  
  //   } catch (error) {
  //     console.error('Error retrieving attendance:', error);
  //     this.email.toastMessage('Failed to retrieve attendance', 'danger', 'close-circle-outline', 'cancel');
  //   }
  // }

  getObjectKeys(obj: any): string[] {
    return Object.keys(obj);
  }

  async viewStudentAttendance(studentNumber: string) {
    try {
      if (!this.selectedModule) {
        this.email.toastMessage('Please select a module first', 'danger', 'close-circle-outline', 'cancel');
        return;
      }
  
      const attendanceRef = this.db.collection('Attended').doc(this.selectedModule);
      
      const doc = await attendanceRef.get().toPromise();
      
      if (!doc?.exists) {
        this.email.toastMessage('No attendance records found', 'warning', 'information-circle-outline', 'cancel');
        return;
      }
  
      const attendanceData = doc.data() || {};
      
      // Filter attendance records for the specific student
      const studentAttendanceDetails = Object.entries(attendanceData)
        .map(([date, records]) => ({
          date,
          attendanceTime: records.find((record: any) => record.studentNumber === studentNumber)?.scanTime
        }))
        .filter(record => record.attendanceTime);
  
      // Open modal to display student's attendance details
      this.selectedStudentAttendance = {
        studentNumber,
        attendanceDetails: studentAttendanceDetails || []  // Ensure array is never undefined
      };
      this.isStudentAttendanceModalOpen = true;
  
    } catch (error) {
      console.error('Error retrieving student attendance:', error);
      this.email.toastMessage('Failed to retrieve student attendance', 'danger', 'close-circle-outline', 'cancel');
    }
  }
  
  // Add these properties to your component
  selectedStudentAttendance: {
    studentNumber: string;
    attendanceDetails: { date: string; attendanceTime: string }[];
  } | null = null;
  isStudentAttendanceModalOpen = false;
  
  closeStudentAttendanceModal() {
    this.isStudentAttendanceModalOpen = false;
    this.selectedStudentAttendance = null;
  }
  
  openAttendanceModal(attendanceSummary: any[]) {
    // Add this to your component properties
    this.attendanceSummary = attendanceSummary;
    this.isAttendanceModalOpen = true;
  }
  
  closeAttendanceModal() {
    this.isAttendanceModalOpen = false;
    this.attendanceSummary = [];
  }

  // Helper method to format mark values
  formatMarkValue(value: number | null | undefined): string {
    if (value === null || value === undefined) return '-';
    return value.toFixed(1);
  }

  // Update the getMarkValue helper method as well
  getMarkValue(student: StudentMarks, mark: keyof StudentMarks): string {
    const value = student[mark];
    if (typeof value === 'number') {
      return value.toFixed(1);
    }
    return '-';
  }

  getModuleMarks(moduleCode: string) {
    this.dataService.getModuleMarks(moduleCode).subscribe((data) => {
      if (data) {
        this.studentMarks = this.processStudentMarks(data.marks);
        this.testPercentages = data.testPercentages;
        this.filteredStudents = [...this.studentMarks];

        // this.applyFilters();

      } else {
        this.studentMarks = [];
        this.filteredStudents = [];
        this.testPercentages = null;
        this.displayedMarks = [];
      }
    });
  }

  onPerformanceChange() {
    this.applyFilters();
  }

  private applyFilters() {
    let filtered = [...this.studentMarks];

    // Add performance threshold filter
    if (this.selectedPerformance !== 'ALL') {
      const threshold = Number(this.selectedPerformance);
      filtered = filtered.filter(student => {
        if (threshold === this.PERFORMANCE_THRESHOLDS.DISTINCTION) {
          return student.average >= threshold;
        } else if (threshold === this.PERFORMANCE_THRESHOLDS.INTERMEDIATE) {
          return student.average >= threshold && student.average < this.PERFORMANCE_THRESHOLDS.DISTINCTION;
        } else if (threshold === this.PERFORMANCE_THRESHOLDS.PARTIAL) {
          return student.average >= threshold && student.average < this.PERFORMANCE_THRESHOLDS.INTERMEDIATE;
        } else {
          return student.average < this.PERFORMANCE_THRESHOLDS.PARTIAL;
        }
      });
    }

    // Apply risk category filter
    if (this.selectedRiskCategory !== 'ALL') {
      filtered = filtered.filter(student => student.riskCategory === this.selectedRiskCategory);
    }

    // Apply module filter if selected
    if (this.selectedModule) {
      filtered = filtered.filter(student => student.moduleCode === this.selectedModule);
    }

    // Apply search filter
    if (this.searchText) {
      const search = this.searchText.toLowerCase();
      filtered = filtered.filter(student =>
        student.studentNumber.toLowerCase().includes(search)
      );
    }

    // Apply range filter
    if (this.selectedRange) {
      const [min, max] = this.selectedRange.split('-').map(Number);
      filtered = filtered.filter(student =>
        student.average >= min && student.average <= max
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const comparison = a.average - b.average;
      return this.selectedOrder === 'ascending' ? comparison : -comparison;
    });

    this.filteredStudents = filtered;
  }

  handleSearch(event: any) {
    this.searchText = event.target.value;
    this.applyFilters();
  }

  onRangeChange() {
    this.applyFilters();
  }

  onOrderChange() {
    this.applyFilters();
  }

  onModuleChange() {
    if (this.selectedModule) {
      this.getModuleMarks(this.selectedModule);
    }
  }

  getProgressBarStyle(average: number): string {
    const percentage = (average / 100) * 100;
    
    let color;
    if (average < this.PERFORMANCE_THRESHOLDS.PARTIAL) {
      color = this.CHART_COLORS.AT_RISK;
    } else if (average < this.PERFORMANCE_THRESHOLDS.INTERMEDIATE) {
      color = this.CHART_COLORS.PARTIAL;
    } else if (average < this.PERFORMANCE_THRESHOLDS.DISTINCTION) {
      color = this.CHART_COLORS.INTERMEDIATE;
    } else {
      color = this.CHART_COLORS.DISTINCTION;
    }
    
    return `linear-gradient(to right, ${color} ${percentage}%, #e0e0e0 ${percentage}%)`;
  }

  getAvailableMentors(moduleCode: string) {

    this.dataService.getMentorsByModule(moduleCode).subscribe((mentors) => {
      this.availableMentors = mentors;
  
    });
  }

  getStudent(studentNumber: any) {
    const studentNumberStr = String(studentNumber);
    
    if (!studentNumberStr || typeof studentNumberStr !== 'string') {
      console.error('Invalid student number provided:',studentNumberStr);
      return; 
    }
    
    this.dataService.getStudentByNumber(studentNumberStr).subscribe(data => {
      if (data) {
        this.studentDetails = data;
        console.log('Student retrieved:', this.studentDetails);
      } else {
        console.log('Student not found.');
      }
    });
  }
  
  async openAssignMentorModal(student: StudentMarks) {

    this.studentDetails={
      department: '',
      email: '',
      name: '',
      studentNumber: '',
      surname: ''
    }
    this.getStudent(student.studentNumber);
 
    this.selectedStudent = student;
    this.isModalOpen = true;
  
    await this.getAvailableMentors(this.selectedModule);
  }

  closeModal() {
    this.isModalOpen = false;
    this.selectedStudent = null;
    this.selectedMentor = null;
  }

  async assignMentorToStudent(mentor:any) {
    if (!this.selectedStudent || !mentor) return;
    try {
      const assignment = {
        studentNumber: this.selectedStudent.studentNumber,
        mentorId: mentor.mentorID,
        moduleCode: String(this.selectedModule ),
        mentorEmail: mentor.email,
        menteeEmail: this.studentDetails.email,
        assignmentDate: new Date().toLocaleDateString()
      };
      const result = await this.dataService.createAssignment(assignment);
      if(!result.success){
      this.email.toastMessage(result.message,'danger','close-circle-outline','cancel');
      return;
      }
      setTimeout(async () => {
      await this.email.notifyMentorAndStudent(this.studentDetails,mentor,this.selectedModule);
    }, 1000); 
    this.email.toastMessage('Mentor assigned successfully!', 'success','checkmark-circle-outline','cancel');
      console.log('Mentor assigned successfully!')
      this.closeModal();
    } catch (error) {
      console.error('Failed to assign mentor. Please try again')
      this.email.toastMessage('Failed to assign mentor. Please try again','danger','close-circle-outline', 'cancel')
    }
  }

  // view student fullDetails
  openViewModal(student:any){

    this.studentDetails={
      department: '',
      email: '',
      name: '',
      studentNumber: '',
      surname: ''
    }
   
    
          this.getStudent(student.studentNumber);
    

    alert(JSON.stringify(student));
 this.fullstudentDetails = {
studentNumber : student.studentNumber,
name: this.studentDetails.name,
surname: this.studentDetails.surname,
test1:student.test1,
test2:student.test2,
test3:student.test3,
test4:student.tests4,
test5:student.test5,
test6:student.test6,
test7:student.test7,
studentavg: student.average
 }

 alert(JSON.stringify(student));

 alert(JSON.stringify(this.fullstudentDetails));
    this.openSelectedStudent = true;

  }

  // Add method to process student marks with categories
  private processStudentMarks(marks: StudentMarks[]) {
    return marks.map(mark => ({
      ...mark,
      riskCategory: this.calculateRiskCategory(mark.average)
    }));
  }

  private calculateRiskCategory(average: number): RiskCategory {
    if (average >= this.PERFORMANCE_THRESHOLDS.DISTINCTION) {
      return RiskCategory.DISTINCTION;
    } else if (average >= this.PERFORMANCE_THRESHOLDS.INTERMEDIATE) {
      return RiskCategory.INTERMEDIATE;
    } else if (average >= this.PERFORMANCE_THRESHOLDS.PARTIAL) {
      return RiskCategory.PARTIALLY_AT_RISK;
    } else {
      return RiskCategory.AT_RISK;
    }
  }
}