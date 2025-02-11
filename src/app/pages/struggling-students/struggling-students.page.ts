

import { Component, OnInit, OnDestroy } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ToastController } from '@ionic/angular';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import{Router} from '@angular/router';
import { DocumentData } from 'firebase/firestore';

// Interfaces
interface Student {
  firstName: string;
  lastName: string;
  email: string;
  average: number;
  tests: {
    test1: number;
    test2: number;
    test3: number;
    test4: number;
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
  email: string;
  module: string;
  currentStudents: number;
}

interface StudentMarks {
  studentNumber: number;
  average: string;
  test1: number;
  test2: number;
  test3: number;
  test4: number;
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
  students: Student[] = [];
  mentors: Mentor[] = [];
  assignedModules: Module[] = [];
  staffIds: string[] = ['22446688', '33557799', '987001'];

  constructor(
    private firestore: AngularFirestore,
    private auth: AngularFireAuth,
    private toastController: ToastController,
    private router: Router
  ) {}

  async ngOnInit() {
    this.auth.onAuthStateChanged((user) => {
      if (user && user.email) {
        this.getStaffNumberAndModules(user.email);
      } else {
        this.presentToast('Please login first', 'warning');
        this.router.navigate(['/login']);
      }
    });
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

    try {
      // Get enrolled students
      const enrolledDoc = await this.firestore
        .collection('enrolledModules')
        .doc(this.selectedModule)
        .get()
        .toPromise();

      if (!enrolledDoc?.exists) {
        console.log('No enrolled students found');
        this.students = [];
        return;
      }

      const enrolledData = enrolledDoc.data() as EnrolledModule;
      
      // Make sure we're accessing the Enrolled array correctly
      if (!enrolledData.Enrolled || !Array.isArray(enrolledData.Enrolled)) {
        console.error('Enrolled data is not in expected format:', enrolledData);
        this.students = [];
        return;
      }

      const enrolledStudents = enrolledData.Enrolled.filter(
        student => student.status === 'Enrolled'
      );

      // Get marks data
      const marksDoc = await this.firestore
        .collection('marks')
        .doc(this.selectedModule)
        .get()
        .toPromise();

      const marksData = marksDoc?.data() as { marks: StudentMarks[] } || { marks: [] };

      // Get all student details in parallel
      const studentPromises = enrolledStudents.map(async (enrolled) => {
        try {
          const studentSnapshot = await this.firestore
            .collection('students')
            .doc(enrolled.studentNumber)
            .get()
            .toPromise();

          if (!studentSnapshot?.exists) {
            console.log(`No student data found for ${enrolled.studentNumber}`);
            return null;
          }

          const studentData = studentSnapshot.data() as {
            name: string;
            surname: string;
            email: string;
            studentNumber: string;
          };

          // Find marks for this student
          const studentMarks = marksData.marks?.find(
            mark => mark.studentNumber.toString() === enrolled.studentNumber
          );

          // Create tests object with default values
          const tests = {
            test1: studentMarks?.test1 ?? 0,
            test2: studentMarks?.test2 ?? 0,
            test3: studentMarks?.test3 ?? 0,
            test4: studentMarks?.test4 ?? 0
          };

          // Calculate average from marks or use provided average
          const average = studentMarks 
            ? parseFloat(studentMarks.average)
            : ((tests.test1 + tests.test2 + tests.test3 + tests.test4) / 4) || 0;

          return {
            studentNumber: studentData.studentNumber,
            firstName: studentData.name,
            lastName: studentData.surname,
            email: studentData.email,
            average: Number(average.toFixed(2)), // Ensure average is a number with 2 decimal places
            tests
          } as Student;
        } catch (error) {
          console.error(`Error loading student ${enrolled.studentNumber}:`, error);
          return null;
        }
      });

      // Wait for all student data to be loaded
      const loadedStudents = await Promise.all(studentPromises);
      
      // Filter out any null values and assign to students array
      this.students = loadedStudents.filter((student): student is Student => 
        student !== null && typeof student.average === 'number' && !isNaN(student.average)
      );
      
      console.log('Loaded students:', this.students);
      
    } catch (error) {
      console.error('Error loading students:', error);
      this.presentToast('Error loading students', 'danger');
    }
  }

  filterStudents(): Student[] {
    // Remove the minimum average filter if you want to show all students
    return this.students
      // .filter(student => student.average < this.minAverage) // Comment this line to show all students
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
      const mentorsSnapshot = await this.firestore
        .collection('mentors')
        .ref.where('module', '==', this.selectedModule)
        .get();

      this.mentors = mentorsSnapshot.docs.map(doc => {
        const data = doc.data() as DocumentData;
        return {
          id: doc.id,
          name: data['name'],
          email: data['email'],
          module: data['module'],
          currentStudents: data['currentStudents']
        } as Mentor;
      });
    } catch (error) {
      console.error('Error loading mentors:', error);
      this.presentToast('Error loading mentors', 'danger');
    }
  }

  async assignMentor(student: Student, mentor: Mentor) {
    try {
      await this.firestore.collection('mentorships').add({
        studentNumber: student.studentNumber,
        mentorId: mentor.id,
        moduleCode: this.selectedModule,
        assignedDate: new Date(),
        status: 'active'
      });

      await this.firestore.collection('mentors').doc(mentor.id).update({
        currentStudents: mentor.currentStudents + 1
      });

      this.presentToast(`Mentor assigned successfully`, 'success');
      this.showMentorModal = false;
    } catch (error) {
      console.error('Error assigning mentor:', error);
      this.presentToast('Error assigning mentor', 'danger');
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
