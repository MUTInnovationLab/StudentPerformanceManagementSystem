// struggling-students.page.ts
import { Component, OnInit } from '@angular/core';

interface Student {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  average: number;
  tests: {
    test1: number;
    test2: number;
    test3: number;
  };
}

interface Mentor {
  id: string;
  name: string;
  email: string;
  module: string;
  currentStudents: number;
}

@Component({
  selector: 'app-struggling-students',
  templateUrl: './struggling-students.page.html',
  styleUrls: ['./struggling-students.page.scss']
})
export class StrugglingStudentsPage implements OnInit {
  selectedModule: string = '';
  minAverage: number = 50;
  sortDirection: 'asc' | 'desc' = 'asc';
  sortField: 'lastName' | 'studentNumber' = 'lastName';
  selectedStudent: Student | null = null;
  showMentorModal = false;

  students: Student[] = [
    {
      id: '1',
      studentNumber: 'STU001',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@university.com',
      average: 45,
      tests: {
        test1: 40,
        test2: 45,
        test3: 50
      }
    },
  
  ];

  mentors: Mentor[] = [
    {
      id: '1',
      name: 'Dr. Smith',
      email: 'smith@university.com',
      module: 'MOD1',
      currentStudents: 3
    },
    {
      id: '1',
      name: 'Dr. Smith',
      email: 'smith@university.com',
      module: 'MOD1',
      currentStudents: 3
    },
    {
      id: '1',
      name: 'Dr. Smith',
      email: 'smith@university.com',
      module: 'MOD1',
      currentStudents: 3
    },
    {
      id: '1',
      name: 'Dr. Smith',
      email: 'smith@university.com',
      module: 'MOD1',
      currentStudents: 3
    },
  
  ];

  constructor() {}

  ngOnInit() {}

  loadStudents() {
    // Implementation to load students based on selected module
    console.log('Loading students for module:', this.selectedModule);
  }

  sortStudents(field: 'lastName' | 'studentNumber') {
    this.sortField = field;
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    // Implement sorting logic
  }

  filterStudents() {
    return this.students.filter(student => student.average < this.minAverage);
  }

  assignMentor(student: Student, mentor: Mentor) {
    // Implementation for mentor assignment
    console.log(`Assigning ${mentor.name} to ${student.firstName} ${student.lastName}`);
    this.sendNotifications(student, mentor);
  }

  async sendNotifications(student: Student, mentor: Mentor) {
    // Implementation for email notifications
    console.log('Sending notifications to:', student.email, mentor.email);
  }

  viewStudentDetails(student: Student) {
    this.selectedStudent = student;
  }
}