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
interface AssignedLecture {
  userEmail: string;
  moduleCode: string;
  moduleName: string;
}

// src/app/models/student.model.ts


// src/app/pages/struggling-students/struggling-students.page.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, Subject, combineLatest, from, of } from 'rxjs';
import { FirestoreService } from '../../services/firestore.service';
import { catchError, finalize, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import { Student } from 'src/app/models/student.model';
import { AngularFireAuth } from '@angular/fire/compat/auth';
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
  private destroy$ = new Subject<void>();
  
  selectedModule: string = '';
  minAverage: number = 50;
  sortDirection: 'asc' | 'desc' = 'asc';
  sortField: 'lastName' | 'studentNumber' = 'lastName';
  selectedStudent: DisplayStudent | null = null;
  showMentorModal = false;
  loading = false;
  error: string | null = null;

  students$: Observable<DisplayStudent[]>;
  mentors$: Observable<Mentor[]>;
  modules$: Observable<{ moduleCode: string; moduleName: string; }[]>;

  constructor(
    private firestore: AngularFirestore, 
    private afAuth: AngularFireAuth,
    private firestoreService: FirestoreService
  ) {
    this.students$ = of([]);
    this.mentors$ = of([]);
    this.modules$ = of([]);
  }

  ngOnInit() {
    this.modules$ = this.loadModulesAlternative();
    
    // Subscribe to see results
    this.modules$.subscribe(
      modules => {
        console.log('Modules loaded:', modules);
        if (modules.length === 0) {
          // Check the collection directly
          this.firestore
            .collection('assignedLectures')
            .get()
            .subscribe(snapshot => {
              console.log('Direct collection check - total documents:', snapshot.size);
              snapshot.forEach(doc => {
                console.log('Document:', doc.id, doc.data());
              });
            });
        }
      },
      error => {
        console.error('Error subscribing to modules:', error);
        this.error = 'Error loading modules: ' + error.message;
      }
    );
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
  private loadInitialData() {
    this.loadStudents();
    this.loadMentors();
  }

  onModuleChange() {
    if (!this.selectedModule) {
      this.error = 'Please select a module';
      return;
    }
    this.error = null;
    this.loadInitialData();
  }
  
  loadModules(): Observable<{ moduleCode: string; moduleName: string }[]> {
    this.loading = true;
    
    // First, let's just get ALL documents in the collection
    return this.firestore
      .collection('assignedLectures')
      .get()
      .pipe(
        map(snapshot => {
          console.log('Total documents found:', snapshot.size);
          
          // Log every document
          snapshot.forEach(doc => {
            console.log('Document data:', doc.data());
          });
          
          return snapshot.docs
            .map(doc => {
              const data = doc.data() as AssignedLecture;
              return {
                moduleCode: data.moduleCode,
                moduleName: data.moduleName
              };
            });
        }),
        tap(results => {
          console.log('Processed results:', results);
        }),
        catchError(error => {
          console.error('Error:', error);
          this.error = 'Error loading modules: ' + error.message;
          this.loading = false;
          return of([]);
        }),
        finalize(() => {
          this.loading = false;
        })
      );
  }  loadModulesAlternative(): Observable<{ moduleCode: string; moduleName: string }[]> {
    this.loading = true;
    
    return this.afAuth.authState.pipe(
      takeUntil(this.destroy$),
      switchMap(user => {
        if (!user?.email) {
          throw new Error('User not authenticated');
        }

        return from(
          this.firestore
            .collection<AssignedLecture>('assignedLectures')
            .ref
            .where('userEmail', '==', user.email)
            .get()
        ).pipe(
          map(querySnapshot => {
            console.log('Raw query snapshot:', querySnapshot);
            const modules = querySnapshot.docs.map(doc => {
              const data = doc.data();
              console.log('Document data:', data);
              return {
                moduleCode: data.moduleCode,
                moduleName: data.moduleName
              };
            });
            console.log('Processed modules:', modules);
            return modules;
          })
        );
      }),
      catchError(error => {
        console.error('Error in loadModulesAlternative:', error);
        this.error = 'Error loading modules: ' + error.message;
        return of([]);
      }),
      finalize(() => {
        this.loading = false;
      })
    );
  }
  loadStudents() {
    if (!this.selectedModule) {
      this.error = 'No module selected';
      return;
    }

    this.loading = true;
    this.error = null;

    this.students$ = this.firestore
      .collection<StudentMarks>('marks', ref =>
        ref.where('moduleCode', '==', this.selectedModule)
      )
      .valueChanges()
      .pipe(
        takeUntil(this.destroy$),
        switchMap(marks => {
          if (!marks?.[0]?.marks?.length) {
            return of([]);
          }

          const studentNumbers = marks[0].marks
            .filter(mark => mark?.studentNumber)
            .map(mark => mark.studentNumber);

          return combineLatest([
            this.firestore
              .collection<Student>('students', ref =>
                ref.where('studentNumber', 'in', studentNumbers)
              )
              .valueChanges(),
            of(marks[0])
          ]);
        }),
        map(([students, moduleMarks]) => {
          if (!students?.length) {
            return [];
          }

          return this.processStudents(students, moduleMarks);
        }),
        tap(() => this.loading = false),
        catchError(error => {
          this.error = 'Error loading students: ' + error.message;
          this.loading = false;
          return of([]);
        })
      );
  }
  private processStudents(students: Student[], moduleMarks: StudentMarks): DisplayStudent[] {
    return students
      .map((student: Student) => {
        const studentMarks = moduleMarks.marks.find(
          mark => mark.studentNumber === student.studentNumber
        );

        if (!studentMarks) {
          return null;
        }

        const tests = {
          test1: this.parseMarkValue(studentMarks.test1),
          test2: this.parseMarkValue(studentMarks.test2),
          test3: this.parseMarkValue(studentMarks.test3),
          test4: this.parseMarkValue(studentMarks.test4),
          test5: this.parseMarkValue(studentMarks.test5),
          test6: this.parseMarkValue(studentMarks.test6)
        };

        return {
          ...student,
          average: this.calculateAverage(tests),
          tests,
          name: student.name || '',
          surname: student.surname || '',
          course: student.course || 'Unknown',
          year: student.year || '1'
        } as DisplayStudent;
      })
      .filter((student): student is DisplayStudent => 
        student !== null && student.average < this.minAverage
      )
      .sort(this.sortStudentsComparator.bind(this));
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
    return values.length ? 
      Number((values.reduce((acc, val) => acc + val, 0) / values.length).toFixed(1)) : 
      0;
  }
  private sortStudentsComparator(a: DisplayStudent, b: DisplayStudent): number {
    const getValue = (student: DisplayStudent) =>
      this.sortField === 'lastName' ? student.surname : student.studentNumber;
    return (this.sortDirection === 'asc' ? 1 : -1) * 
           getValue(a).localeCompare(getValue(b));
  }
  sortStudents(field: 'lastName' | 'studentNumber') {
    this.sortField = field;
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    this.loadStudents();
  }

  

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunked: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunked.push(array.slice(i, i + size));
    }
    return chunked;
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

    this.loading = true;
    this.mentors$ = this.firestore
      .collection<Mentor>('mentors', ref =>
        ref.where('module', '==', this.selectedModule)
      )
      .valueChanges()
      .pipe(
        takeUntil(this.destroy$),
        tap(() => this.loading = false),
        catchError(error => {
          this.error = 'Error loading mentors: ' + error.message;
          this.loading = false;
          return of([]);
        })
      );
  }


  async assignMentor() {
    if (!this.selectedStudent) {
      this.error = 'No student selected';
      return;
    }

    try {
      this.loading = true;
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

      await this.firestoreService.assignMentor(mentor);
      this.showMentorModal = false;
      // Optional: Show success message
    } catch (error: any) {
      this.error = 'Error assigning mentor: ' + error.message;
    } finally {
      this.loading = false;
    }
  }
}
