interface StudentMarks {
  moduleCode: string;
  testPercentages: {
    [key: string]: number;
  };
  marks: Array<{
    studentNumber: string;
    test1?: number;
    test2?: number;
    test3?: number;
    test4?: number;
    test5?: number;
    test6?: number;
    average?: string;
  }>;
}
interface DisplayStudent extends Student {
  name: string;
  surname: string;
  course: string;
  year: string;
  average: number;
  tests: {
    test1: number;
    test2: number;
    test3: number;
    test4?: number;
    test5?: number;
    test6?: number;
  };
}

// src/app/models/student.model.ts


// src/app/pages/struggling-students/struggling-students.page.ts
import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, combineLatest, of } from 'rxjs';
import { FirestoreService } from '../../services/firestore.service';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { Student } from 'src/app/models/student.model';
import { Mentor } from '../../models/mentor.model';

interface DisplayStudent extends Student {
  name: string;
  surname: string;
  course: string;
  year: string;
  average: number;
  tests: {
    test1: number;
    test2: number;
    test3: number;
    test4?: number;
    test5?: number;
    test6?: number;
  };
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
  selectedStudent: DisplayStudent | null = null;
  showMentorModal = false;

  students$: Observable<DisplayStudent[]>;
  mentors$: Observable<Mentor[]>;
  modules$: Observable<{ moduleCode: string; moduleName: string; }[]>;

  constructor(
    private firestore: AngularFirestore, 
    private firestoreService: FirestoreService
  ) {
    this.students$ = of([]);
    this.mentors$ = of([]);
    this.modules$ = of([]);
  }

  ngOnInit() {
    this.modules$ = this.loadModules();
  }

  onModuleChange() {
    console.log('Selected Module:', this.selectedModule);
    this.loadStudents();
    this.loadMentors();
  }

  loadModules(): Observable<{ moduleCode: string; moduleName: string; }[]> {
    return this.firestore.collection<StudentMarks>('marks')
      .valueChanges()
      .pipe(
        map(marks => {
          if (!marks?.length) {
            console.log('No marks found');
            return [];
          }

          const moduleMap = new Map<string, string>();
          marks.forEach(mark => {
            if (mark.moduleCode) {
              moduleMap.set(mark.moduleCode, mark.moduleCode);
            }
          });

          return Array.from(moduleMap.entries()).map(([code, name]) => ({
            moduleCode: code,
            moduleName: name
          }));
        }),
        tap(modules => console.log('Loaded modules:', modules))
      );
  }

  loadStudents() {
    if (!this.selectedModule) {
      console.log('No module selected');
      this.students$ = of([]);
      return;
    }

    this.students$ = this.firestore
      .collection<StudentMarks>('marks', ref =>
        ref.where('moduleCode', '==', this.selectedModule)
      )
      .valueChanges()
      .pipe(
        tap(marks => {
          console.log('Raw marks data:', JSON.stringify(marks, null, 2));
        }),
        switchMap(marks => {
          if (!marks?.length || !marks[0]?.marks?.length) {
            console.log('No marks found for module');
            return of([]);
          }

          const studentNumbers = marks[0].marks
            .filter(mark => mark?.studentNumber)
            .map(mark => mark.studentNumber);

          console.log('Extracted student numbers:', studentNumbers);

          if (!studentNumbers.length) {
            console.log('No valid student numbers found');
            return of([]);
          }

          console.log('Querying students collection for numbers:', studentNumbers);

          // Query all students at once instead of chunking
          return combineLatest([
            this.firestore
              .collection<Student>('students', ref =>
                ref.where('studentNumber', 'in', studentNumbers)
              )
              .valueChanges(),
            of(marks[0])
          ]).pipe(
            tap(([students, _]) => {
              console.log('Found students:', students);
            }),
            map(([students, moduleMarks]) => {
              if (!students?.length) {
                console.log('No students found in database');
                console.log('Sample student query that should exist:', studentNumbers[0]);
                return [];
              }

              const processedStudents = students
                .map((student: Student) => {
                  const studentMarks = moduleMarks.marks.find(
                    mark => mark.studentNumber === student.studentNumber
                  );

                  if (!studentMarks) {
                    console.log(`No marks found for student: ${student.studentNumber}`);
                    return null;
                  }

                  console.log(`Processing student ${student.studentNumber}:`, {
                    marks: studentMarks,
                    student: student
                  });

                  const tests = {
                    test1: this.parseMarkValue(studentMarks.test1),
                    test2: this.parseMarkValue(studentMarks.test2),
                    test3: this.parseMarkValue(studentMarks.test3),
                    test4: this.parseMarkValue(studentMarks.test4),
                    test5: this.parseMarkValue(studentMarks.test5),
                    test6: this.parseMarkValue(studentMarks.test6)
                  };

                  const average = this.calculateAverage(tests);

                  return {
                    ...student,
                    average,
                    tests,
                    name: student.name || '',
                    surname: student.surname || '',
                    course: student.course || 'Unknown',
                    year: student.year || '1'
                  } as DisplayStudent;
                })
                .filter((student: DisplayStudent | null): student is DisplayStudent => {
                  if (!student) {
                    return false;
                  }
                  const belowThreshold = student.average < this.minAverage;
                  console.log(`Student ${student.studentNumber} average: ${student.average}, below threshold: ${belowThreshold}`);
                  return belowThreshold;
                })
                .sort(this.sortStudentsComparator.bind(this));

              console.log('Final processed students:', processedStudents);
              return processedStudents;
            })
          );
        }),
        catchError(error => {
          console.error('Error processing students:', error);
          return of([]);
        })
      );
  }

  private parseMarkValue(mark: any): number {
    if (typeof mark === 'string' && mark.trim() === '') {
      return 0;
    }
    const parsed = Number(mark);
    return isNaN(parsed) ? 0 : parsed;
  }

  private calculateAverage(marks: { [key: string]: number }): number {
    const values = Object.values(marks).filter(mark => mark > 0);
    if (!values.length) {
      return 0;
    }
    const sum = values.reduce((acc, val) => acc + val, 0);
    return Number((sum / values.length).toFixed(1));
  }

  

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunked: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunked.push(array.slice(i, i + size));
    }
    return chunked;
  }
 

  private sortStudentsComparator(a: DisplayStudent, b: DisplayStudent): number {
    const getValue = (student: DisplayStudent) =>
      this.sortField === 'lastName' ? 
        student.surname : 
        student.studentNumber;

    const compareValue = getValue(a).localeCompare(getValue(b));
    return this.sortDirection === 'asc' ? compareValue : -compareValue;
  }

  sortStudents(field: 'lastName' | 'studentNumber') {
    this.sortField = field;
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    this.loadStudents();
  }

  viewStudentDetails(student: DisplayStudent) {
    this.selectedStudent = student;
  }

  closeStudentDetails() {
    this.selectedStudent = null;
  }

  loadMentors() {
    if (!this.selectedModule) {
      this.mentors$ = of([]);
      return;
    }

    this.mentors$ = this.firestore
      .collection<Mentor>('mentors', ref =>
        ref.where('module', '==', this.selectedModule)
      )
      .valueChanges()
      .pipe(
        tap(mentors => console.log('Loaded mentors:', mentors))
      );
  }

  assignMentor() {
    if (!this.selectedStudent) return;

    const mentor = {
      id: '',
      mentorID: '',
      name: this.selectedStudent.name,
      surname: this.selectedStudent.surname,
      email: this.selectedStudent.email || '',
      faculty: this.selectedStudent.faculty || '',
      department: this.selectedStudent.department || '',
      stream: this.selectedStudent['stream'] || '',
      modules: this.selectedStudent['modules'] || [],
    };

    this.firestoreService.assignMentor(mentor)
      .then(() => {
        console.log('Mentor assigned successfully');
        this.showMentorModal = false;
      })
      .catch(error => {
        console.error('Error assigning mentor:', error);
      });
  }
}
