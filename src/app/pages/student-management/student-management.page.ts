
// student-management.page.ts
import { Component, OnInit } from '@angular/core';
import { Staff } from 'src/app/models/staff.model';
import { AuthenticationService } from '../../services/auths.service';
import { DataService } from 'src/app/services/data.service';
import {Module } from 'src/app/models/assignedModules.model';
import {  StudentMarks,  TestPercentages, ModuleMarksDocument } from '../../models/studentsMarks.model';
// import { ModalController } from '@ionic/angular';
// import { AlertController, LoadingController,ToastController } from '@ionic/angular';
import { Student } from 'src/app/models/users.model';
import { Router } from '@angular/router';  // Add this import at the top

import { EmailService } from 'src/app/services/email.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';
@Component({
  selector: 'app-student-management',
  templateUrl: './student-management.page.html',
  styleUrls: ['./student-management.page.scss'],
})
export class StudentManagementPage implements OnInit {
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

  studentDetails: Student={
    department: '',
    email: '',
    name: '',
    studentNumber: '',
    surname: ''
  }
  openSelectedStudent : boolean =false;
  fullstudentDetails:any;
  
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
    });

    const staffNumber = '12345677';
    this.dataService.getModulesByStaffNumber(staffNumber).subscribe(data => {
      this.modules = data;
      if (this.modules.length > 0) {
        this.selectedModule = this.modules[0].moduleCode;
        this.getModuleMarks('55tt');
      }
    });
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
  formatMarkValue(value: number | null): string {
    if (value === null) return '-';
    return value.toFixed(1);
  }

  // Helper method to get typed mark value
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
        this.studentMarks = data.marks;
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

  applyFilters() {
    let filtered = [...this.studentMarks];

    if (this.searchText) {
      const search = this.searchText.toLowerCase();
      filtered = filtered.filter(student =>
        student.studentNumber.toLowerCase().includes(search)
      );
    }

    if (this.selectedRange) {
      const [min, max] = this.selectedRange.split('-').map(Number);
      filtered = filtered.filter(student =>
        student.average >= min && student.average <= max
      );
    }

  
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

  // getProgressBarStyle(average: number): string {
  //   const percentage = (average / 100) * 100;
  //   const color = average < 40 ? '#ff4444' : '#2196f3';
  //   return `linear-gradient(to right, ${color} ${percentage}%, #e0e0e0 ${percentage}%)`;
  // }
  getProgressBarStyle(average: number): string {
    const percentage = (average / 100) * 100;
  
    let color;
    if (average < 40) {
      color = '#ff4444'; 
    } else if (average >= 41 && average <= 50) {
      color = '#ffbb33'; 
    } else if (average >= 51 && average <= 74) {
      color = '#2196f3'; 
    } else if (average >= 75 && average <= 100) {
      color = '#00C851'; 
    }
  
    return `linear-gradient(to right, ${color} ${percentage}%, #e0e0e0 ${percentage}%)`;
  }
  
   
    getAvailableMentors(moduleCode: string) {

      this.dataService.getMentorsByModule('55tt').subscribe((mentors) => {
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
}