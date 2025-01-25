import { Component, OnInit } from '@angular/core';
import { FirestoreService } from 'src/app/services/firestore.service';
import { Student, Feedback } from 'src/app/models/feedback.model';
@Component({
  selector: 'app-supportfeedback',
  templateUrl: './supportfeedback.page.html',
  styleUrls: ['./supportfeedback.page.scss'],
})
export class SupportfeedbackPage implements OnInit {
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

  constructor(private firestoreService: FirestoreService) {}

  ngOnInit() {
    this.loadStudents();
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
