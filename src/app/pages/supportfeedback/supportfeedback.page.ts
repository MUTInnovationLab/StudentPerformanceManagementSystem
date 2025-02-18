import { Component, OnInit } from '@angular/core';
import { FirestoreService } from 'src/app/services/firestore.service';
import { Router } from '@angular/router';
import { AuthenticationService } from '../../services/auths.service';
import { AlertController } from '@ionic/angular';
import { Student, Feedback } from 'src/app/models/feedback.model';
@Component({
  selector: 'app-supportfeedback',
  templateUrl: './supportfeedback.page.html',
  styleUrls: ['./supportfeedback.page.scss'],
})
export class SupportfeedbackPage implements OnInit {
  menuVisible: boolean = false;
  students: Student[] = [];
  feedbackHistory: Record<number, Feedback[]> = {};

  selectedStudent: Student | null = null;
  searchTerm: string = '';
  activeView: 'list' | 'detail' | 'addFeedback' = 'list';
  activeTab: 'history' | 'details' | 'addFeedback' = 'history';
  showSuccessMessage: boolean = false;

  private readonly attendanceClasses: Record<'excellent' | 'good' | 'fair' | 'poor', string> = {
    excellent: 'attendance-excellent',
    good: 'attendance-good',
    fair: 'attendance-fair',
    poor: 'attendance-poor'
  };

  newFeedback: Feedback = this.getEmptyFeedbackForm();

  constructor(private firestoreService: FirestoreService,private router: Router,private authService: AuthenticationService,    private alertController: AlertController,

  ) {}

  ngOnInit() {
    this.loadStudents();
  }

  openMenu() {
    this.menuVisible = !this.menuVisible;
  }
  Dashboard(){
    this.router.navigate(['/dashboard']);  // Ensure you have this route set up
    this.menuVisible = false;  // Hide the menu after selecting
  }
  goToStudentsManagement(){
    this.router.navigate(['/student-management']);  // Ensure you have this route set up
    this.menuVisible = false;  // Hide the menu after selecting
  }
  goToStrugglingStudents(){
    this.router.navigate(['/struggling-students']);  // Ensure you have this route set up
    this.menuVisible = false;  // Hide the menu after selecting
  }
  goToMentorStudents(){
    this.router.navigate(['/mentor-students']);  // Ensure you have this route set up
    this.menuVisible = false;  // Hide the menu after selecting
  }
  studentPerformance(){
    this.router.navigate(['/student-perfomance']);  // Ensure you have this route set up
    this.menuVisible = false;  // Hide the menu after selecting
  }

  Csv(){
    this.router.navigate(['/csv']);  // Ensure you have this route set up
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

  
  async showLogoutMessage() {
    const alert = await this.alertController.create({
      header: 'Logged Out',
      message: 'You have been successfully logged out.',
      buttons: ['OK']
    });
    await alert.present();
  }

  loadStudents(): void {
    this.firestoreService.getStudents().subscribe(
      (students: Student[]) => {
        this.students = students;
      },
      (error: any) => {
        console.error('Error loading students:', error);
      }
    );
  }

  loadFeedback(studentId: number): void {
    this.firestoreService.getFeedbacks(studentId).subscribe(
      (feedbacks: Feedback[] | unknown[]) => {
        this.feedbackHistory[studentId] = feedbacks as Feedback[];
      },
      (error: any) => {
        console.error('Error loading feedback:', error);
      }
    );
  }  
  
  get filteredStudents(): Student[] {
    return this.students.filter(student =>
      student.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      student.department.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  get studentFeedback(): Feedback[] {
    return this.selectedStudent
      ? (this.feedbackHistory[this.selectedStudent.id] || []).sort((a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime())
      : [];
  }

  selectStudent(student: Student): void {
    this.selectedStudent = student;
    this.activeView = 'detail';
    this.activeTab = 'history';
    this.loadFeedback(student.id);
  }

  showFeedbackForm(): void {
    this.newFeedback = this.getEmptyFeedbackForm();
    if (this.selectedStudent) {
      this.newFeedback.studentId = this.selectedStudent.id;
    }
    this.activeTab = 'addFeedback';
  }

  submitFeedback(): void {
    if (this.selectedStudent && this.validateFeedback()) {
      this.firestoreService.addFeedback(this.newFeedback).then(() => {
        this.loadFeedback(this.selectedStudent!.id);
        this.showSuccessMessage = true;
        this.activeView = 'detail';
        setTimeout(() => {
          this.showSuccessMessage = false;
        }, 3000);
      });
    }
  }

  private validateFeedback(): boolean {
    return !!this.newFeedback.date &&
           !!this.newFeedback.attendance &&
           !!this.newFeedback.technicalProgress;
  }

  private getEmptyFeedbackForm(): Feedback {
    return {
      studentId: 0,
      date: new Date().toISOString(),
      technicalProgress: '',
      softSkills: '',
      attendance: 'good',
      completedTasks: '',
      areasForImprovement: '',
      supportNeeded: '',
      recommendations: ''
    };
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString();
  }

  getAttendanceClass(attendance: 'excellent' | 'good' | 'fair' | 'poor'): string {
    return this.attendanceClasses[attendance];
  }
}
