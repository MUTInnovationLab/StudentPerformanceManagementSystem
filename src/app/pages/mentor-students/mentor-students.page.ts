import { Component, OnInit } from '@angular/core';
import { AngularFirestore, DocumentData } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthenticationService } from 'src/app/services/auths.service';

interface Mentor {
  id: string;
  name: string;
  surname: string;
  email: string;
  department: string;
  faculty: string;
  modules: string[];
  mentorID: string;
  currentStudents: number;
  stream: string;
}

interface Student {
  studentNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  average: number;
  moduleCode: string;
  tests?: {
    test1: number;
    test2: number;
    test3: number;
    test4: number;
    test5: number;
    test6: number;
    test7: number;
  };
}

interface Mentorship {
  studentNumber: string;
  moduleCode: string;
  mentorID: string;
  status: string;
  endDate?: Date;
}

interface StudentData {
  studentNumber: string;
  name: string;
  surname: string;
  email: string;
}

interface MarksData {
  marks: Array<{
    studentNumber: number;
    average: string;
    test1: number;
    test2: number;
    test3: number;
    test4: number;
    test5: number;
    test6: number;
    test7: number;
  }>;
}

@Component({
  selector: 'app-mentor-students',
  templateUrl: './mentor-students.page.html',
  styleUrls: ['./mentor-students.page.scss']
})
export class MentorStudentsPage implements OnInit {
  menuVisible = false;
  mentors: Mentor[] = [];
  selectedMentorId: string = '';
  selectedMentor: Mentor | null = null;
  mentorStudents: Student[] = [];
  selectedStudent: Student | null = null;

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

  async loadMentors() {
    try {
      const querySnapshot = await this.firestore
        .collection<Mentor>('mentors')
        .get()
        .toPromise();

      if (!querySnapshot) {
        this.mentors = [];
        return;
      }

      this.mentors = querySnapshot.docs.map(doc => ({
        ...(doc.data() as Mentor),
        id: doc.id
      }));

      console.log('Loaded mentors:', this.mentors);
    } catch (error) {
      console.error('Error loading mentors:', error);
      this.presentToast('Error loading mentors', 'danger');
    }
  }

  async loadMentorStudents() {
    if (!this.selectedMentorId) {
      this.presentToast('Please select a mentor', 'warning');
      return;
    }

    try {
      // Get selected mentor details
      this.selectedMentor = this.mentors.find(m => m.mentorID === this.selectedMentorId) || null;

      // Get mentorships
      const mentorshipsSnapshot = await this.firestore
        .collection<Mentorship>('mentorships')
        .ref.where('mentorID', '==', this.selectedMentorId)
        .where('status', '==', 'active')
        .get();

      const studentPromises = mentorshipsSnapshot.docs.map(async doc => {
        const mentorship = doc.data() as Mentorship;
        
        // Get student details
        const studentDoc = await this.firestore
          .collection<StudentData>('students')
          .doc(mentorship.studentNumber)
          .get()
          .toPromise();

        // Get student marks
        const marksDoc = await this.firestore
          .collection<MarksData>('marks')
          .doc(mentorship.moduleCode)
          .get()
          .toPromise();

        if (studentDoc?.exists) {
          const studentData = studentDoc.data() as StudentData;
          const marksData = marksDoc?.data()?.marks || [];
          
          // Find student marks
          const studentMarks = marksData.find(
            mark => mark.studentNumber.toString() === mentorship.studentNumber
          );

          // Create tests object
          const tests = studentMarks ? {
            test1: studentMarks.test1 || 0,
            test2: studentMarks.test2 || 0,
            test3: studentMarks.test3 || 0,
            test4: studentMarks.test4 || 0,
            test5: studentMarks.test5 || 0,
            test6: studentMarks.test6 || 0,
            test7: studentMarks.test7 || 0
          } : undefined;

          return {
            studentNumber: studentData.studentNumber,
            firstName: studentData.name,
            lastName: studentData.surname,
            email: studentData.email,
            moduleCode: mentorship.moduleCode,
            average: studentMarks ? parseFloat(studentMarks.average) : 0,
            tests
          } as Student;
        }
        return null;
      });

      const loadedStudents = await Promise.all(studentPromises);
      this.mentorStudents = loadedStudents.filter((student): student is Student => 
        student !== null
      );

    } catch (error) {
      console.error('Error loading mentor students:', error);
      this.presentToast('Error loading students', 'danger');
    }
  }

  async removeMentorship(student: Student) {
    try {
      // Find the mentorship document
      const mentorshipSnapshot = await this.firestore
        .collection<Mentorship>('mentorships')
        .ref.where('studentNumber', '==', student.studentNumber)
        .where('mentorID', '==', this.selectedMentorId)
        .where('status', '==', 'active')
        .get();

      if (!mentorshipSnapshot.empty) {
        // Update mentorship status to 'inactive'
        await mentorshipSnapshot.docs[0].ref.update({
          status: 'inactive',
          endDate: new Date()
        });

        // Update mentor's current students count
        if (this.selectedMentor) {
          await this.firestore
            .collection('mentors')
            .doc(this.selectedMentor.id)
            .update({
              currentStudents: (this.selectedMentor.currentStudents || 1) - 1
            });
        }

        this.presentToast('Mentorship removed successfully', 'success');
        await this.loadMentorStudents(); // Refresh the list
      }
    } catch (error) {
      console.error('Error removing mentorship:', error);
      this.presentToast('Error removing mentorship', 'danger');
    }
  }

  viewStudentDetails(student: Student) {
    this.selectedStudent = student;
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