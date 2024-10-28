import { Component, OnInit } from '@angular/core';

interface Student {
  id: number;
  name: string;
  course: string;
  enrollmentDate: string;
}

type AttendanceType = 'excellent' | 'good' | 'fair' | 'poor';

interface Feedback {
  id?: number;
  studentId: number;
  date: string;
  technicalProgress: string;
  softSkills: string;
  attendance: AttendanceType;
  completedTasks: string;
  areasForImprovement: string;
  supportNeeded: string;
  recommendations: string;
}

type AttendanceClasses = Record<AttendanceType, string>;

@Component({
  selector: 'app-supportfeedback',
  templateUrl: './supportfeedback.page.html',
  styleUrls: ['./supportfeedback.page.scss'],
})
export class SupportfeedbackPage implements OnInit {
  // Data properties
  students: Student[] = [
    { id: 1, name: "Alice Johnson", course: "Web Development", enrollmentDate: "2024-01-15" },
    { id: 2, name: "Bob Smith", course: "Data Science", enrollmentDate: "2024-01-20" },
    { id: 3, name: "Carol Williams", course: "UX Design", enrollmentDate: "2024-02-01" }
  ];

  feedbackHistory: Record<number, Feedback[]> = {
    1: [
      {
        id: 1,
        studentId: 1,
        date: "2024-03-15",
        technicalProgress: "Showing great progress in React fundamentals",
        softSkills: "Excellent team communication",
        attendance: "excellent",
        completedTasks: "Completed all React assignments",
        areasForImprovement: "Could improve CSS skills",
        supportNeeded: "None at this time",
        recommendations: "Ready to move to advanced topics"
      }
    ]
  };

  // UI state properties
  selectedStudent: Student | null = null;
  searchTerm: string = '';
  activeView: 'list' | 'detail' | 'form' = 'list';
  activeTab: 'history' | 'details' | 'addFeedback' = 'history';
  showSuccessMessage: boolean = false;

  private readonly attendanceClasses: AttendanceClasses = {
    excellent: 'attendance-excellent',
    good: 'attendance-good',
    fair: 'attendance-fair',
    poor: 'attendance-poor'
  };

  // Form data
  newFeedback: Feedback = this.getEmptyFeedbackForm();

  constructor() { }

  ngOnInit() {
  }

  // Filter students based on search term
  get filteredStudents(): Student[] {
    return this.students.filter(student =>
      student.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      student.course.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  // Get feedback history for selected student
  get studentFeedback(): Feedback[] {
    return this.selectedStudent 
      ? (this.feedbackHistory[this.selectedStudent.id] || []).sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime())
      : [];
  }

  // UI Methods
  selectStudent(student: Student): void {
    this.selectedStudent = student;
    this.activeView = 'detail';
    this.activeTab = 'history';
  }

  showFeedbackForm(): void {
    this.newFeedback = this.getEmptyFeedbackForm();
    if (this.selectedStudent) {
      this.newFeedback.studentId = this.selectedStudent.id;
    }
    this.activeTab = 'addFeedback';
  }

  cancelFeedback(): void {
    this.activeView = 'detail';
  }

  setActiveTab(tab: 'history' | 'details' | 'addFeedback'): void {
    this.activeTab = tab;
  }

  // Form handling
  submitFeedback(): void {
    if (this.selectedStudent && this.validateFeedback()) {
      if (!this.feedbackHistory[this.selectedStudent.id]) {
        this.feedbackHistory[this.selectedStudent.id] = [];
      }
      
      const newFeedbackWithId = {
        ...this.newFeedback,
        id: this.generateFeedbackId()
      };
      
      this.feedbackHistory[this.selectedStudent.id].unshift(newFeedbackWithId);
      
      this.showSuccessMessage = true;
      this.activeView = 'detail';
      
      setTimeout(() => {
        this.showSuccessMessage = false;
      }, 3000);
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

  private generateFeedbackId(): number {
    return Math.floor(Math.random() * 10000);
  }

  // Helper methods
  formatDate(date: string): string {
    return new Date(date).toLocaleDateString();
  }

  getAttendanceClass(attendance: AttendanceType): string {
    return this.attendanceClasses[attendance];
  }
}