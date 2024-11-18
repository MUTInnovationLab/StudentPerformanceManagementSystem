import { Component, OnInit } from '@angular/core';
import { AngularFirestore, QuerySnapshot, DocumentData } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// Add these interfaces to your existing interfaces
interface Module {
  code: string;
  name: string;
  department: string;
  credits: number;
  moduleName: string;
}

interface FacultyDocument {
  name?: string;
  modules?: Module[]; // Modules might be directly in faculty
  departments?: {
    name: string;
    modules?: Module[];
  }[];
}

interface HOD {
  name: string;
  email: string;
  department: string;
  phone: string;
}
interface Department {
  name: string;
  streams?: any; // We only care about the name field for counting
}
interface Faculty {
  departments: Department[];
  modules: Module[];
}
interface StudentMark {
  average: string;
  studentNumber: number;
  test1?: number;
  test2?: number;
  test3?: number;
  test4?: number;
  test5?: number;
  test6?: string;
  test7?: string;
}
interface MarksDocument {
  marks: StudentMark[];
  moduleCode?: string;
  testPercentages?: {
    test1: number;
    test2: number;
    test3: number;
    test4: number;
    test5: number;
    test6: number;
    test7: number;
  };
}

interface StatCard {
  title: string;
  count: number;
  icon: string;
  color: string;
  details?: any[];
}
interface DetailItem {
  id?: string;
  name?: string;
  email?: string;
  department?: string;
  position?: string;
  courses?: string[];
  studentNumber?: number;
  average?: number;
  [key: string]: any; // For other dynamic properties
}


// Interface for Performance Data
interface PerformanceData {
  month: string;
  students: number;
  assignments: number;
  attendance: number;
}

@Component({
  selector: 'app-admin',
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss'],
})
export class AdminPage implements OnInit {
  objectKeys = Object.keys;
  Array = Array;
  // Stat cards with initial count values
  stats: StatCard[] = [
    { title: 'Lecturers', count: 0, icon: 'school', color: 'primary' },
    { title: 'Mentors', count: 0, icon: 'people', color: 'secondary' },
    { title: 'Students', count: 0, icon: 'person', color: 'tertiary' },
    { title: 'Courses', count: 0, icon: 'book', color: 'success' },
    { title: 'Modules', count: 0, icon: 'library', color: 'warning' },
    { title: 'Departments', count: 0, icon: 'business', color: 'medium' },
    { title: 'HODs', count: 0, icon: 'person-circle', color: 'dark' },
    { title: 'Faculties', count: 0, icon: 'school-outline', color: 'primary' } // New Faculties card
  ];

  // Sample performance data
  performanceData: PerformanceData[] = [
    { month: 'Jan', students: 85, assignments: 78, attendance: 92 },
    { month: 'Feb', students: 88, assignments: 82, attendance: 90 },
    { month: 'Mar', students: 90, assignments: 85, attendance: 94 },
    { month: 'Apr', students: 87, assignments: 80, attendance: 91 },
    { month: 'May', students: 92, assignments: 88, attendance: 95 }
  ];
  selectedCard: StatCard | null = null;
  showDetails = false;
  modules: Module[] = [];
  departments: Department[] = [];
  hods: HOD[] = [];

  // Academic statistics
  academicStats = {
    passingRate: 0,
    averageGrade: 3.4,
    completionRate: 92,
    satisfactionRate: 88
  };

  constructor(private router: Router, private firestore: AngularFirestore) {}

  // Lifecycle method to initialize data
  ngOnInit() {
    this.fetchMentorsCount();
    this.fetchStudentsCount();
    this.fetchLecturersCount();
    this.fetchDepartmentNamesCount();
    this.fetchPassingRate();
    this.loadAllData();
    this.fetchDepartments();
    this.fetchHODs();
    this.fetchFacultiesData(); // Load faculties data
    this.debugFirestoreStructure();
  }
  debugFirestoreStructure() {
    this.firestore.collection('faculties').get().subscribe(snapshot => {
      snapshot.docs.forEach(doc => {
        console.log('Faculty Document ID:', doc.id);
        console.log('Faculty Data:', doc.data());
      });
    });
  }


  loadAllData() {
    this.fetchLecturersData();
    this.fetchMentorsData();
    this.fetchStudentsData();
    this.fetchCoursesData();
    this.fetchModules();
    

  }
  

  // Navigate to home
  navigateHome() {
    this.router.navigate(['/home']);
  }

  fetchFacultiesData() {
    const facultiesStat = this.stats.find(stat => stat.title === 'Faculties');
    this.firestore.collection('faculties')
      .snapshotChanges()
      .pipe(
        map(actions => actions.map(a => ({
          id: a.payload.doc.id,
          ...a.payload.doc.data() as FacultyDocument
        })))
      )
      .subscribe(faculties => {
        facultiesStat!.count = faculties.length;
        facultiesStat!.details = faculties.map(faculty => ({
          id: faculty.id,
          name: faculty.name || 'Unnamed Faculty',
          departmentsCount: faculty.departments?.length || 0,
          modulesCount: faculty.modules?.length || 0
        }));
      });
  }
  
  fetchModules() {
    const modulesStat = this.stats.find(stat => stat.title === 'Modules');
    
    this.firestore.collection('faculties')
      .get()
      .subscribe({
        next: (snapshot) => {
          const allModules: Module[] = [];
          
          snapshot.docs.forEach(doc => {
            const facultyData = doc.data() as FacultyDocument;
            
            // Check modules directly in faculty
            if (facultyData.modules && Array.isArray(facultyData.modules)) {
              const modulesWithDepartment = facultyData.modules.map(module => ({
                ...module,
                department: facultyData.name || 'Unknown Department'
              }));
              allModules.push(...modulesWithDepartment);
            }
            
            // Check modules in departments
            if (facultyData.departments && Array.isArray(facultyData.departments)) {
              facultyData.departments.forEach(department => {
                if (department.modules && Array.isArray(department.modules)) {
                  const modulesWithDepartment = department.modules.map(module => ({
                    ...module,
                    department: department.name
                  }));
                  allModules.push(...modulesWithDepartment);
                }
              });
            }
          });
          
          this.modules = allModules;
          if (modulesStat) {
            modulesStat.count = allModules.length;
            modulesStat.details = allModules.map(module => ({
              name: module.moduleName || module.name,
              code: module.code,
              department: module.department,
              credits: module.credits
            }));
          }
          
          console.log('Total modules found:', allModules.length);
          console.log('All modules:', allModules);
        },
        error: (error) => {
          console.error('Error fetching modules:', error);
        }
      });
  }
  fetchDepartments() {
    const departmentsStat = this.stats.find(stat => stat.title === 'Departments');
  
    this.firestore.collection('faculties')
      .get()
      .subscribe({
        next: (snapshot) => {
          let departmentCount = 0;
          const allDepartments: Department[] = [];
  
          snapshot.docs.forEach(doc => {
            const facultyData = doc.data() as FacultyDocument;
  
            // Check if the faculty has departments
            if (facultyData.departments && Array.isArray(facultyData.departments)) {
              departmentCount += facultyData.departments.length; // Add the number of departments
              allDepartments.push(...facultyData.departments); // Collect departments
            }
          });
  
          // Update the departments count on the stat card
          if (departmentsStat) {
            departmentsStat.count = departmentCount;
            departmentsStat.details = allDepartments.map(department => ({
              name: department.name,
              streams: department.streams || []
            }));
          }
  
          console.log('Total departments found:', departmentCount);
          console.log('All departments:', allDepartments);
        },
        error: (error) => {
          console.error('Error fetching departments:', error);
        }
      });
  }
  
  fetchHODs() {
    const hodsStat = this.stats.find(stat => stat.title === 'HODs');
    this.firestore.collection('staff', ref => ref.where('position', '==', 'HOD'))
      .snapshotChanges()
      .pipe(
        map(actions => actions.map(a => {
          const data = a.payload.doc.data() as HOD;
          return { id: a.payload.doc.id, ...data };
        }))
      )
      .subscribe(hods => {
        this.hods = hods;
        if (hodsStat) {
          hodsStat.count = hods.length;
          hodsStat.details = hods;
        }
      });
  }

 
  fetchLecturersData() {
    const lecturerStat = this.stats.find(stat => stat.title === 'Lecturers');
    this.firestore.collection('staff', ref => ref.where('position', '==', 'Lecturer'))
      .snapshotChanges()
      .pipe(
        map(actions => actions.map(a => {
          const data = a.payload.doc.data() as DetailItem;
          return { id: a.payload.doc.id, ...data };
        }))
      )
      .subscribe(lecturers => {
        if (lecturerStat) {
          lecturerStat.count = lecturers.length;
          lecturerStat.details = lecturers;
        }
      });
  }

  fetchMentorsData() {
    const mentorStat = this.stats.find(stat => stat.title === 'Mentors');
    this.firestore.collection('mentors')
      .snapshotChanges()
      .pipe(
        map(actions => actions.map(a => {
          const data = a.payload.doc.data() as DetailItem;
          return { id: a.payload.doc.id, ...data };
        }))
      )
      .subscribe(mentors => {
        if (mentorStat) {
          mentorStat.count = mentors.length;
          mentorStat.details = mentors;
        }
      });
  }
  fetchStudentsData() {
    const studentStat = this.stats.find(stat => stat.title === 'Students');
    this.firestore.collection('students')
      .snapshotChanges()
      .pipe(
        map(actions => actions.map(a => {
          const data = a.payload.doc.data() as DetailItem;
          return { id: a.payload.doc.id, ...data };
        }))
      )
      .subscribe(students => {
        if (studentStat) {
          studentStat.count = students.length;
          studentStat.details = students;
        }
      });
  }
  fetchCoursesData() {
    const coursesStat = this.stats.find(stat => stat.title === 'Courses');
    this.firestore.collection('faculties')
      .get()
      .subscribe(snapshot => {
        const departments: DetailItem[] = [];
        snapshot.docs.forEach(doc => {
          const faculty = doc.data() as any;
          if (faculty.departments && Array.isArray(faculty.departments)) {
            departments.push(...faculty.departments);
          }
        });
        
        if (coursesStat) {
          coursesStat.count = departments.length;
          coursesStat.details = departments;
        }
      });
  }
  
  showCardDetails(card: StatCard) {
    console.log('Selected Card Details:', card.details); // Check if details are populated
    this.selectedCard = card;
    this.showDetails = true;
  }
  
  closeDetails() {
    this.showDetails = false;
    this.selectedCard = null;
  }
  getFieldLabel(key: string): string {
    const labels: { [key: string]: string } = {
      name: 'Name',
      email: 'Email',
      department: 'Department',
      position: 'Position',
      courses: 'Courses',
      studentNumber: 'Student Number',
      average: 'Average Grade',
      specialization: 'Specialization',
      streams: 'Streams'
    };
    return labels[key] || key;
  }

  // Helper method to check if field should be displayed
  shouldDisplayField(key: string): boolean {
    const excludedFields = ['id', 'password', 'uid', 'createdAt', 'updatedAt'];
    return !excludedFields.includes(key);
  }

  // Fetch the total count of mentors from Firestore
  fetchMentorsCount(): void {
    this.firestore.collection('mentors')
      .get()
      .subscribe({
        next: (snapshot) => {
          const mentorCount = snapshot.size; // Get the total number of documents in the 'mentors' collection
          const mentorStat = this.stats.find(stat => stat.title === 'Mentors');
          if (mentorStat) {
            mentorStat.count = mentorCount; // Update the count on the stat card
          }
        },
        error: (error) => {
          console.error("Error fetching mentor count:", error);
        }
      });
  }

  // Fetch the total count of students from Firestore
  fetchStudentsCount(): void {
    this.firestore.collection('students')
      .get()
      .subscribe({
        next: (snapshot) => {
          const studentCount = snapshot.size; // Get the total number of documents in the 'students' collection
          const studentStat = this.stats.find(stat => stat.title === 'Students');
          if (studentStat) {
            studentStat.count = studentCount; // Update the count on the stat card
          }
        },
        error: (error) => {
          console.error("Error fetching student count:", error);
        }
      });
  }

  // Fetch the total count of lecturers from Firestore by filtering 'staff' collection
  fetchLecturersCount(): void {
    this.firestore.collection('staff', ref => ref.where('position', '==', 'Lecturer'))
      .get()
      .subscribe({
        next: (snapshot) => {
          const lecturerCount = snapshot.size; // Get the total number of documents where position is 'Lecturer'
          const lecturerStat = this.stats.find(stat => stat.title === 'Lecturers');
          if (lecturerStat) {
            lecturerStat.count = lecturerCount; // Update the count on the stat card
          }
        },
        error: (error) => {
          console.error("Error fetching lecturer count:", error);
        }
      });
  }

  // Fetch the total count of courses from Firestore based on faculty name
  fetchDepartmentNamesCount(): void {
    this.firestore.collection('faculties')
      .get()
      .subscribe({
        next: (snapshot) => {
          const uniqueDepartmentNames = new Set<string>();

          snapshot.docs.forEach(doc => {
            const faculty = doc.data() as Faculty;
            
            if (faculty.departments && Array.isArray(faculty.departments)) {
              faculty.departments.forEach(department => {
                if (department.name) {
                  uniqueDepartmentNames.add(department.name);
                }
              });
            }
          });

          // Update the Courses stat card with the count of unique department names
          const coursesStat = this.stats.find(stat => stat.title === 'Courses');
          if (coursesStat) {
            coursesStat.count = uniqueDepartmentNames.size;
            console.log(`Total unique department names found: ${uniqueDepartmentNames.size}`);
            console.log('Department names:', Array.from(uniqueDepartmentNames));
          }
        },
        error: (error) => {
          console.error("Error fetching department names count:", error);
          // Update the Courses stat card to show 0 in case of error
          const coursesStat = this.stats.find(stat => stat.title === 'Courses');
          if (coursesStat) {
            coursesStat.count = 0;
          }
        }
      });
  }
  fetchPassingRate(): void {
    this.firestore.collection<MarksDocument>('marks')
      .get()
      .subscribe((snapshot) => {
        if (snapshot.empty) {
          console.log('No marks found in collection');
          return;
        }

        let totalStudents = 0;
        let passingStudents = 0;

        snapshot.docs.forEach(doc => {
          const data = doc.data();
          console.log('Document data:', data);

          if (data && Array.isArray(data.marks)) {
            data.marks.forEach(studentMark => {
              if (studentMark.average) {
                // Convert average from string to number
                const averageNum = parseFloat(studentMark.average);
                if (!isNaN(averageNum)) {
                  totalStudents++;
                  if (averageNum >= 50) {
                    passingStudents++;
                  }
                  console.log(`Student ${studentMark.studentNumber}: Average = ${averageNum}`);
                }
              }
            });
          }
        });

        console.log(`Final counts - Total students: ${totalStudents}, Passing students: ${passingStudents}`);

        if (totalStudents > 0) {
          const passingRate = (passingStudents / totalStudents) * 100;
          console.log(`Calculated passing rate: ${passingRate}%`);
          this.academicStats.passingRate = Math.round(passingRate * 10) / 10;
        } else {
          console.log('No valid student marks found');
          this.academicStats.passingRate = 0;
        }
      }, (error) => {
        console.error("Error fetching passing rate:", error);
      });
  }
}