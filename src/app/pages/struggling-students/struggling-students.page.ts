import { Component, OnInit } from '@angular/core';
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
    
    console.log('Loading students for module:', this.selectedModule);
    this.students = []; // Clear existing students
    
    try {
      // 1. Get enrolled students
      const enrolledDoc = await this.firestore
        .collection('enrolledModules')
        .doc(this.selectedModule)
        .get()
        .toPromise();
        
      if (!enrolledDoc?.exists) {
        console.log('No enrolled students document found');
        return;
      }

      const enrolledData = enrolledDoc.data() as EnrolledModule;
      if (!enrolledData?.Enrolled || !Array.isArray(enrolledData.Enrolled)) {
        console.error('Invalid enrolled data structure:', enrolledData);
        return;
      }
  
      // 2. Get marks for the module
      const marksDoc = await this.firestore
        .collection('marks')
        .doc(this.selectedModule)
        .get()
        .toPromise();
  
      const marksData = marksDoc?.exists 
        ? (marksDoc.data() as { marks: StudentMarks[] })
        : { marks: [] };
  
      // 3. Process each enrolled student
      const enrolledStudents = enrolledData.Enrolled.filter(
        student => student.status === 'Enrolled'
      );
  
      const processedStudents = await Promise.all(
        enrolledStudents.map(async (enrolled) => {
          try {
            // Get student details
            const studentDoc = await this.firestore
              .collection('students')
              .doc(enrolled.studentNumber)
              .get()
              .toPromise();
  
            if (!studentDoc?.exists) {
              console.log(`No data found for student ${enrolled.studentNumber}`);
              return null;
            }
  
            const studentData = studentDoc.data() as {
              name: string;
              surname: string;
              email: string;
              studentNumber: string;
            };
  
            // Find student marks
            const studentMarks = marksData.marks?.find(
              mark => mark.studentNumber.toString() === enrolled.studentNumber
            );
  
            // Get tests from marks collection
            const tests = {
              test1: Number(studentMarks?.test1) || 0,
              test2: Number(studentMarks?.test2) || 0,
              test3: Number(studentMarks?.test3) || 0,
              test4: Number(studentMarks?.test4) || 0,
              test5: Number(studentMarks?.test5) || 0,
              test6: Number(studentMarks?.test6) || 0,
              test7: Number(studentMarks?.test7) || 0
            };
  
            // Get average from marks collection instead of calculating
            const average = Number(studentMarks?.average) || 0;
  
            // Check for existing mentor
            const mentorshipDocs = await this.firestore
              .collection('mentorships')
              .ref.where('studentNumber', '==', enrolled.studentNumber)
              .where('moduleCode', '==', this.selectedModule)
              .where('status', '==', 'active')
              .get();
  
            let hasMentor = false;
            let assignedMentor: { id: string; name: string; surname: string; } | undefined;
  
            if (!mentorshipDocs.empty) {
              const mentorshipData = mentorshipDocs.docs[0].data() as MentorshipData;
              const mentorDoc = await this.firestore
                .collection('mentors')
                .doc(mentorshipData.mentorID)
                .get()
                .toPromise();
  
              if (mentorDoc?.exists) {
                const mentorData = mentorDoc.data() as Mentor;
                hasMentor = true;
                assignedMentor = {
                  id: mentorDoc.id,
                  name: mentorData.name,
                  surname: mentorData.surname
                };
              }
            }
  
            // Construct and return student object
            return {
              studentNumber: studentData.studentNumber,
              firstName: studentData.name,
              lastName: studentData.surname,
              email: studentData.email,
              average: Number(average.toFixed(2)),
              tests,
              hasMentor,
              assignedMentor
            } as Student;
  
          } catch (error) {
            console.error(`Error processing student ${enrolled.studentNumber}:`, error);
            return null;
          }
        })
      );
  
      // Filter out null values and assign to students array
      this.students = processedStudents.filter((student): student is Student => 
        student !== null
      );
  
      console.log(`Successfully loaded ${this.students.length} students`);
  
    } catch (error) {
      console.error('Error in loadStudents:', error);
      this.presentToast('Error loading students data', 'danger');
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
        const mentorshipData: MentorshipData = {
          studentNumber: student.studentNumber,
          mentorID: mentor.mentorID,
          moduleCode: this.selectedModule,
          assignedDate: new Date(),
          status: 'active',
          department: this.currentDepartment
        };
        await this.firestore.collection('mentorships').add(mentorshipData);
        await this.firestore.collection('mentors').doc(mentor.id).update({
          currentStudents: (mentor.currentStudents || 0) + 1
        });
        student.hasMentor = true;
        student.assignedMentor = {
          id: mentor.id,
          name: mentor.name,
          surname: mentor.surname
        };
        this.presentToast(`Mentor ${mentor.name} assigned successfully`, 'success');
        this.showMentorModal = false;
        this.selectedStudent = null;
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
    const selectedModuleData = this.assignedModules.find(
      module => module.moduleCode === this.selectedModule
    );
    if (!selectedModuleData) {
      console.log('No module selected or module data not found');
      this.mentors = [];
      return;
    }
    this.currentDepartment = selectedModuleData.department;
    console.log('Current Department:', this.currentDepartment);
    console.log('Querying mentors with department:', this.currentDepartment);
    const allMentorsSnapshot = await this.firestore
      .collection<MentorData>('mentors')
      .get()
      .toPromise();
    if (!allMentorsSnapshot) {
      console.log('No mentors snapshot returned');
      this.mentors = [];
      return;
    }
    console.log('All mentors in database:');
    allMentorsSnapshot.docs.forEach(doc => {
      console.log('Mentor:', doc.data());
    });
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
  }
   viewStudentDetails(student: Student) {
    this.selectedStudent = student;
    this.loadMentors(); // Load mentors when viewing student details
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