import { Component, OnInit, HostListener } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthenticationService } from 'src/app/services/auths.service';

import { DocumentData } from '@angular/fire/compat/firestore';

// Interfaces
interface Student {
  studentNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  average: number;
  tests: {
    test1: number;
    test2: number;
    test3: number;
    test4: number;
    test5: number;
    test6: number;
    test7: number;
  };
  hasMentor: boolean;
  assignedMentor?: {
    id: string;
    name: string;
    surname: string;
  };
}

interface MentorshipData {
  studentNumber: string;
  mentorID: string;
  moduleCode: string;
  assignedDate: Date;
  status: string;
  department: string;
}

interface Module {
  moduleCode: string;
  moduleName: string;
  department: string;
  moduleLevel: string;
  faculty?: string;
  scannerOpenCount?: number;
  userEmail?: string;
}

interface Mentor {
  id: string;
  name: string;
  surname: string;
  email: string;
  department: string;
  faculty: string;
  modules: string[];
  mentorID: string;
  currentStudents?: number;
  stream: string;
}

interface MentorData {
  name: string;
  surname: string;
  email: string;
  department: string;
  faculty: string;
  modules: string[];
  mentorID: string;
  currentStudents?: number;
  stream: string;
}

interface StudentMarks {
  studentNumber: number;
  average: string;
  test1: number;
  test2: number;
  test3: number;
  test4: number;
  test5: number;
  test6: number;
  test7: number;
}

interface EnrolledModule {
  Enrolled: Array<{
    status: string;
    studentNumber: string;
  }>;
  moduleCode: string;
}

interface AssignedLectureData {
  modules: Module[];
}

interface Mentor {
  id: string;
  name: string;
  surname: string;
  email: string;
  department: string;
  faculty: string;
  modules: string[];
  mentorID: string;
  currentStudents?: number;
  stream: string;
}

@Component({
  selector: 'app-struggling-students',
  templateUrl: './struggling-students.page.html',
  styleUrls: ['./struggling-students.page.scss']
})
export class StrugglingStudentsPage implements OnInit {
  menuVisible: boolean = false;
  selectedModule: string = '';
  minAverage: number = 50;
  sortDirection: 'asc' | 'desc' = 'asc';
  sortField: 'lastName' | 'studentNumber' = 'lastName';
  selectedStudent: Student | null = null;
  showMentorModal = false;
  students: Student[] = [];
  mentors: Mentor[] = [];
  assignedModules: Module[] = [];
  staffIds: string[] = ['22446688', '33557799', '987001'];
  currentDepartment: string = '';
  showStudentDetailsModal = false;

  constructor(
    private authService: AuthenticationService,
    private firestore: AngularFirestore,
    private auth: AngularFireAuth,
    private toastController: ToastController,
    private router: Router
  ) {}

  async ngOnInit() {
    this.auth.onAuthStateChanged((user) => {
      if (user && user.email) {
        this.getStaffNumberAndModules(user.email);
        // Load mentors when the page initializes
        this.loadMentors();
      } else {
        this.presentToast('Please login first', 'warning');
        this.router.navigate(['/login']);
      }
    });
  }
  openMenu() {
    this.menuVisible = !this.menuVisible;
  }

  goToMeeting() {
    this.router.navigate(['/live-meet']);
  }

  goToCsv() {
    this.router.navigate(['/csv']);
  }

  goToStudentsManagement() {
    this.router.navigate(['/student-management']);
  }
  dashboard(){
    this.router.navigate(['/dashboard']);
  }

  logout() {
    this.authService.signOut().then(() => {
      this.router.navigate(['/login']);
    });
  }
  supportFeedback(){
    this.router.navigate(['/supportfeedback']);
  }
  mentorStudents(){
    this.router.navigate(['/mentor-students']);
  }


  

  async getStaffNumberAndModules(userEmail: string) {
    try {
      const staffPromises = this.staffIds.map(async (staffId) => {
        const docRef = this.firestore.collection('assignedLectures').doc(staffId);
        const doc = await docRef.get().toPromise();
        
        if (doc?.exists) {
          const data = doc.data() as AssignedLectureData;
          if (data && Array.isArray(data.modules)) {
            const hasUserModule = data.modules.some(
              (module: Module) => module.userEmail === userEmail
            );
            
            if (hasUserModule) {
              return {
                staffNumber: staffId,
                modules: data.modules.filter(
                  (module: Module) => module.userEmail === userEmail
                )
              };
            }
          }
        }
        return null;
      });

      const results = await Promise.all(staffPromises);
      const staffData = results.find(result => result !== null);

      if (staffData) {
        this.assignedModules = staffData.modules;
        console.log('Assigned modules:', this.assignedModules);
      } else {
        console.log('No modules found for this lecturer');
        this.assignedModules = [];
      }
    } catch (error) {
      console.error('Error getting staff data:', error);
      this.presentToast('Error loading modules', 'danger');
    }
  }

  async loadStudents() {
    if (!this.selectedModule) {
      this.presentToast('Please select a module', 'warning');
      return;
    }
  
    try {
      // Trim the module code to handle potential spaces
      const trimmedModuleCode = this.selectedModule.trim();
      
      const enrolledDoc = await this.firestore
        .collection('enrolledModules')
        .doc(trimmedModuleCode)
        .get()
        .toPromise();
  
      if (!enrolledDoc?.exists) {
        console.log('No enrolled students found for module:', trimmedModuleCode);
        this.students = [];
        return;
      }
  
      const enrolledData = enrolledDoc.data() as EnrolledModule;
      
      // Get marks data
      const marksDoc = await this.firestore
        .collection('marks')
        .doc(trimmedModuleCode)
        .get()
        .toPromise();
  
      console.log('Marks data retrieved:', marksDoc?.data()); // Debug log
  
      const marksData = marksDoc?.data() as { marks: StudentMarks[] } || { marks: [] };
  
      // Debug log for marks data
      console.log('Processed marks data:', marksData);
  
      const enrolledStudents = enrolledData.Enrolled.filter(
        student => student.status === 'Enrolled'
      );
  
      const studentPromises = enrolledStudents.map(async (enrolled) => {
        try {
          // Convert student number to string for consistent comparison
          const studentNumberStr = enrolled.studentNumber;
          
          // Find marks for this student - handle both string and number types
          const studentMarks = marksData.marks?.find(
            mark => mark.studentNumber.toString() === studentNumberStr
          );
  
          // Debug log for individual student marks
          console.log(`Student ${studentNumberStr} marks:`, studentMarks);
  
          const studentSnapshot = await this.firestore
            .collection('students')
            .doc(studentNumberStr)
            .get()
            .toPromise();
  
          if (!studentSnapshot?.exists) {
            console.log(`No student data found for ${studentNumberStr}`);
            return null;
          }
  
          const studentData = studentSnapshot.data() as {
            name: string;
            surname: string;
            email: string;
            studentNumber: string;
          };
  
          const tests = {
            test1: studentMarks?.test1 ?? 0,
            test2: studentMarks?.test2 ?? 0,
            test3: studentMarks?.test3 ?? 0,
            test4: studentMarks?.test4 ?? 0,
            test5: studentMarks?.test5 ? Number(studentMarks.test5) : 0,
            test6: studentMarks?.test6 ? Number(studentMarks.test6) : 0,
            test7: studentMarks?.test7 ? Number(studentMarks.test7) : 0
          };
  
          // Calculate average from marks if available, otherwise from tests
          const average = studentMarks 
            ? parseFloat(studentMarks.average)
            : Object.values(tests).reduce((sum, val) => sum + val, 0) / 
              Object.values(tests).filter(val => val > 0).length || 0;
  
          return {
            studentNumber: studentData.studentNumber,
            firstName: studentData.name,
            lastName: studentData.surname,
            email: studentData.email,
            average: Number(average.toFixed(2)),
            tests,
            hasMentor: false // Will be updated by mentor check
          } as Student;
  
        } catch (error) {
          console.error(`Error loading student ${enrolled.studentNumber}:`, error);
          return null;
        }
      });
  
      const loadedStudents = await Promise.all(studentPromises);
      this.students = loadedStudents.filter((student): student is Student => 
        student !== null
      );
  
      console.log('Final loaded students:', this.students);
  
    } catch (error) {
      console.error('Error loading students:', error);
      this.presentToast('Error loading students', 'danger');
    }
  }
  async cleanupModuleData(moduleCode: string) {
    try {
      const trimmedCode = moduleCode.trim();
      
      // Update module code in marks collection
      const marksRef = this.firestore.collection('marks').doc(moduleCode);
      const marksDoc = await marksRef.get().toPromise();
      if (marksDoc?.exists) {
        await marksRef.delete();
        await this.firestore.collection('marks').doc(trimmedCode).set(marksDoc.data()!);
      }
  
      // Update module code in enrolledModules collection
      const enrolledRef = this.firestore.collection('enrolledModules').doc(moduleCode);
      const enrolledDoc = await enrolledRef.get().toPromise();
      if (enrolledDoc?.exists) {
        await enrolledRef.delete();
        await this.firestore.collection('enrolledModules').doc(trimmedCode).set(enrolledDoc.data()!);
      }
  
      this.presentToast('Module data cleaned up successfully', 'success');
    } catch (error) {
      console.error('Error cleaning up module data:', error);
      this.presentToast('Error cleaning up module data', 'danger');
    }
  }
  async assignMentor(student: Student, mentor: Mentor) {
    if (!student) {
      this.presentToast('No student selected', 'warning');
      return;
    }
  
    if (student.average >= 50) {
      this.presentToast('Can only assign mentors to students with average below 50%', 'warning');
      return;
    }
  
    try {
      // Check if student already has a mentor using proper query syntax
      const existingMentorQuery = this.firestore.collection('mentorships', ref => 
        ref.where('studentNumber', '==', student.studentNumber)
           .where('moduleCode', '==', this.selectedModule)
           .where('status', '==', 'active')
      );
  
      const existingMentorSnapshot = await existingMentorQuery.get().toPromise();
  
      if (existingMentorSnapshot) {
        if (!existingMentorSnapshot.empty) {
          this.presentToast('Student already has a mentor assigned', 'warning');
          return;
        }
  
        // Create mentorship record
        const mentorshipData: MentorshipData = {
          studentNumber: student.studentNumber,
          mentorID: mentor.mentorID,
          moduleCode: this.selectedModule,
          assignedDate: new Date(),
          status: 'active',
          department: this.currentDepartment
        };
  
        await this.firestore.collection('mentorships').add(mentorshipData);
  
        // Update mentor's current students count
        await this.firestore.collection('mentors').doc(mentor.id).update({
          currentStudents: (mentor.currentStudents || 0) + 1
        });
  
        // Update local student data
        student.hasMentor = true;
        student.assignedMentor = {
          id: mentor.id,
          name: mentor.name,
          surname: mentor.surname
        };
  
        this.presentToast(`Mentor ${mentor.name} assigned successfully`, 'success');
        this.showMentorModal = false;
        this.selectedStudent = null;
        
        // Refresh the students list to show updated mentor status
        await this.loadStudents();
      }
    } catch (error) {
      console.error('Error assigning mentor:', error);
      this.presentToast('Error assigning mentor', 'danger');
    }
  }

  getMentorDisplayText(student: Student): string {
    if (student.hasMentor && student.assignedMentor) {
      return `Mentor: ${student.assignedMentor.name} ${student.assignedMentor.surname}`;
    }
    return 'Assign Mentor';
  }


  filterStudents(): Student[] {
    return this.students
      .filter(student => student.average < this.minAverage) // Uncomment and modify this line
      .sort((a, b) => {
        const factor = this.sortDirection === 'asc' ? 1 : -1;
        if (this.sortField === 'lastName') {
          return factor * a.lastName.localeCompare(b.lastName);
        } else {
          return factor * a.studentNumber.localeCompare(b.studentNumber);
        }
      });
  }


  sortStudents(field: 'lastName' | 'studentNumber') {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
  }

async loadMentors() {
  try {
    // First, get the department of the selected module
    const selectedModuleData = this.assignedModules.find(
      module => module.moduleCode === this.selectedModule
    );

    if (!selectedModuleData) {
      console.log('No module selected or module data not found');
      this.mentors = [];
      return;
    }

    // Store the current department
    this.currentDepartment = selectedModuleData.department;
    console.log('Current Department:', this.currentDepartment);

    // Debug: Log the query parameters
    console.log('Querying mentors with department:', this.currentDepartment);

    // Get all mentors first to debug
    const allMentorsSnapshot = await this.firestore
      .collection<MentorData>('mentors')
      .get()
      .toPromise();

    if (!allMentorsSnapshot) {
      console.log('No mentors snapshot returned');
      this.mentors = [];
      return;
    }

    // Debug: Log all mentors and their departments
    console.log('All mentors in database:');
    allMentorsSnapshot.docs.forEach(doc => {
      console.log('Mentor:', doc.data());
    });

    // Filter mentors by department
    this.mentors = allMentorsSnapshot.docs
      .map(doc => {
        const data = doc.data() as MentorData;
        return {
          id: doc.id,
          name: data.name,
          surname: data.surname,
          email: data.email,
          department: data.department,
          faculty: data.faculty,
          modules: data.modules || [],
          mentorID: data.mentorID,
          currentStudents: data.currentStudents || 0,
          stream: data.stream
        } as Mentor;
      })
      .filter(mentor => mentor.department === this.currentDepartment);

    // Debug: Log filtered mentors
    console.log('Filtered mentors:', this.mentors);
    console.log('Number of filtered mentors:', this.mentors.length);

    if (this.mentors.length === 0) {
      console.log('No mentors found after filtering for department:', this.currentDepartment);
      this.presentToast(
        `No available mentors found in ${this.currentDepartment} department`, 
        'warning'
      );
    } else {
      console.log(`Found ${this.mentors.length} mentors in department ${this.currentDepartment}`);
    }

  } catch (error) {
    console.error('Error loading mentors:', error);
    this.presentToast('Error loading mentors', 'danger');
    this.mentors = [];
  }
}



  async openMentorModal(student: Student) {
    this.selectedStudent = student;
    await this.loadMentors();
    this.showMentorModal = true;
    this.showStudentDetailsModal = false;
  }

 
   // Update the viewStudentDetails method to load mentors when opening details
   viewStudentDetails(student: Student) {
    this.selectedStudent = student;
    this.loadMentors(); // Load mentors when viewing student details
    this.showMentorModal = false;
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      color,
      duration: 2000,
      position: 'top'
    });
    toast.present();
  }
}