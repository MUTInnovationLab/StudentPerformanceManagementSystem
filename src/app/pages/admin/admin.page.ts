import { Component, OnInit } from '@angular/core';
import { AngularFirestore, QuerySnapshot, DocumentData } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PopoverController } from '@ionic/angular';
import { ProfileComponent } from '../../components/profile/profile.component';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AlertController, AlertInput } from '@ionic/angular';
import { LoadingController } from '@ionic/angular';


type ValidInputTypes = 'text' | 'number' | 'email' | 'tel' | 'password' | 'date' | 'textarea' | 'checkbox' | 'radio';

interface BaseItem {
  id: string;
  name: string;
  email: string;
  position?: string;
  collection?: string; // Added to track which collection the item belongs to
  [key: string]: any;
}

interface UpdatedData {
  id?: string;
  collection?: string;
  [key: string]: any;
}
// Add these interfaces to your existing interfaces
interface Module {
  moduleCode: string;
  moduleLevel: string;
  moduleName: string;
  department?: string;
}

interface FacultyModule {
  modules: Module[];
}

interface ModuleDetail {
  name: string;
  code: string;
  department: string;
  level: string;
}

interface Stat {
  title: string;
  count: number;
  details?: ModuleDetail[];
}

interface FacultyDocument {
  name: string;
  modules: Module[];
  departments?: Department[];
}
interface FacultyStat {
  id: string;
  name: string;
  departmentsCount: number;
  modulesCount: number;
}

interface HOD {
  name: string;
  fullName: string;
  email: string;
  department: string;
  phone: string;
}
interface Department {
  name: string;
  modules?: Module[];
    streams?: string[];  // Add the streams property

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
  isLoggedIn: boolean = false;
  private readonly validCollections = ['staff', 'mentors', 'students', 'faculties'];


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

  constructor(private router: Router, private firestore: AngularFirestore,private popoverController: PopoverController,private auth: AngularFireAuth,    private alertController: AlertController,
  private loadingController: LoadingController,

  // Add this injection
  ) {this.auth.authState.subscribe(user => {
    console.log('Admin page auth state:', user);
    this.isLoggedIn = !!user;
    if (!user) {
      console.log('No user logged in, redirecting to login');
      this.router.navigate(['/login']);
    }
  });
}

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
  async presentProfilePopover(event: any) {
    console.log('Profile popover triggered', event);
    
    try {
      const popover = await this.popoverController.create({
        component: ProfileComponent,
        event: event,
        translucent: true,
        cssClass: 'profile-popover',
        size: 'auto',
        dismissOnSelect: false,
        alignment: 'end',
        arrow: true,
        backdropDismiss: true
      });
  
      await popover.present();
      console.log('Popover presented successfully');
  
      const { data } = await popover.onWillDismiss();
      console.log('Popover dismissed with data:', data);
    } catch (error) {
      console.error('Error presenting popover:', error);
    }
  }
  async deleteItem(collectionPath: string, itemId: string) {
    const alert = await this.alertController.create({
      header: 'Confirm Delete',
      message: 'Are you sure you want to delete this item?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          handler: async () => {
            const loading = await this.loadingController.create({
              message: 'Deleting...'
            });
            await loading.present();

            try {
              await this.firestore.collection(collectionPath).doc(itemId).delete();
              this.loadAllData(); // Refresh the data
              await loading.dismiss();
            } catch (error) {
              console.error('Error deleting item:', error);
              await loading.dismiss();
              await this.showAlert('Error', 'Failed to delete item');
            }
          }
        }
      ]
    });
    await alert.present();
  }
  async updateItem(item: Partial<BaseItem>, collectionPath?: string) {
    if (!item?.id) {
      await this.showAlert('Error', 'Item ID is missing or undefined');
      return false;
    }

    // Determine the collection path
    const collection = collectionPath || item.collection || this.determineCollection(item);
    
    if (!collection || !this.validCollections.includes(collection)) {
      await this.showAlert('Error', 'Invalid or missing collection path');
      return false;
    }

    try {
      // Clean the data by removing undefined and null values
      const cleanData = Object.entries(item).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null && key !== 'collection') {
          acc[key] = value === '' ? null : value;
        }
        return acc;
      }, {} as Record<string, any>);

      if (Object.keys(cleanData).length === 0) {
        throw new Error('No valid data to update');
      }

      // Get reference to the document in the correct collection
      const docRef = this.firestore.collection(collection).doc(item.id);
      const docSnapshot = await docRef.get().toPromise();

      if (!docSnapshot?.exists) {
        // Document doesn't exist, create it
        console.log(`Creating new document in ${collection} collection...`);
        await docRef.set(cleanData);
        console.log('Document created successfully');
      } else {
        // Document exists, update it
        await docRef.update(cleanData);
        console.log(`Document updated successfully in ${collection} collection`);
      }

      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('Error updating item:', error);
      await this.showAlert('Error', `Failed to update item: ${errorMessage}`);
      return false;
    }
  }
  private determineCollection(item: Partial<BaseItem>): string | null {
    if (item.position?.toLowerCase().includes('lecturer') || 
        item.position?.toLowerCase().includes('hod')) {
      return 'staff';
    }
    if (item.position?.toLowerCase().includes('mentor')) {
      return 'mentors';
    }
    if (item.position?.toLowerCase().includes('student')) {
      return 'students';
    }
    if (item.position?.toLowerCase().includes('faculty')) {
      return 'faculties';
    }
    return null;
  }
  
  async editItem(collectionPath: string, item: BaseItem) {
    if (!item?.id) {
      await this.showAlert('Error', 'Cannot edit item: Missing ID');
      return;
    }

    try {
      // Verify the collection path and document existence
      const docRef = this.firestore.collection(collectionPath).doc(item.id);
      const docSnapshot = await docRef.get().toPromise();

      if (!docSnapshot?.exists) {
        console.log(`Document ${item.id} does not exist in ${collectionPath}`);
        await this.showAlert('Warning', 'Creating new record as it does not exist');
      }

      const excludedFields = ['id', 'createdAt', 'updatedAt', 'collection'];
      const inputs = Object.entries(item)
        .filter(([key]) => !excludedFields.includes(key))
        .map(([key, value]) => ({
          name: key,
          type: this.getInputType(key),
          placeholder: this.formatLabel(key),
          value: value?.toString() ?? '',
          label: this.formatLabel(key)
        } as AlertInput));

      const alert = await this.alertController.create({
        header: docSnapshot?.exists ? 'Edit Item' : 'Create Item',
        inputs,
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel'
          },
          {
            text: 'Save',
            handler: async (formData) => {
              const loading = await this.loadingController.create({
                message: 'Saving changes...'
              });
              await loading.present();

              try {
                const updatedData: UpdatedData = {};
                inputs.forEach((input) => {
                  if (input.name && formData[input.name] !== undefined) {
                    updatedData[input.name] = formData[input.name].trim();
                  }
                });

                updatedData['id'] = item.id;
                
                // Pass the collection path to updateItem
                const success = await this.updateItem(updatedData, collectionPath);
                if (success) {
                  this.loadAllData(); // Refresh the data
                }
              } catch (error: unknown) {
                console.error('Error in edit handler:', error);
                await this.showAlert('Error', 'Failed to process edit');
              } finally {
                await loading.dismiss();
              }
            }
          }
        ]
      });
      await alert.present();
    } catch (error: unknown) {
      console.error('Error in editItem:', error);
      await this.showAlert('Error', 'Failed to prepare edit form');
    }
  }

  getCollectionPathForCard(cardTitle: string): string {
    const pathMap: Record<string, string> = {
      'Lecturers': 'staff',
      'Mentors': 'mentors',
      'Students': 'students',
      'HODs': 'staff',
      'Faculties': 'faculties'
    };
    return pathMap[cardTitle] || '';
  }

  private getInputType(key: string): ValidInputTypes {
    const typeMap: Record<string, ValidInputTypes> = {
      email: 'email',
      phone: 'tel',
      password: 'password',
      age: 'number',
      date: 'date',
      description: 'textarea',
      active: 'checkbox',
      status: 'radio'
    };
    return typeMap[key] || 'text';
  }

  private formatLabel(key: string): string {
    return key
      .split(/(?=[A-Z])|_/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  private async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }



  fetchFacultiesData() {
    const facultiesStat = this.stats.find(stat => stat.title === 'Faculties');
    
    this.firestore.collection('faculties')
      .snapshotChanges()
      .pipe(
        map(actions => actions.map(a => ({
          ...a.payload.doc.data() as FacultyDocument, // Spread data first
          id: a.payload.doc.id, // Add `id` after
        })))
      )
      .subscribe(faculties => {
        facultiesStat!.count = faculties.length;
        facultiesStat!.details = faculties.map(faculty => {
          const displayName = faculty.name?.trim() || faculty.id;
          
          return {
            id: faculty.id,
            name: displayName,
            departmentsCount: faculty.departments?.length || 0,
            modulesCount: faculty.modules?.length || 0
          };
        });
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
  
            // Extract modules directly under faculty
            if (Array.isArray(facultyData.modules)) {
              facultyData.modules.forEach(module => {
                allModules.push({
                  moduleCode: module.moduleCode,
                  moduleLevel: module.moduleLevel,
                  moduleName: module.moduleName,
                  department: facultyData.name || 'Unknown Department'
                });
              });
            }
  
            // Extract modules from departments
            if (Array.isArray(facultyData.departments)) {
              facultyData.departments.forEach(department => {
                if (Array.isArray(department.modules)) {
                  department.modules.forEach(module => {
                    allModules.push({
                      moduleCode: module.moduleCode,
                      moduleLevel: module.moduleLevel,
                      moduleName: module.moduleName,
                      department: department.name
                    });
                  });
                }
              });
            }
          });
  
          // Update the modules array
          this.modules = allModules;
  
          // Update statistics
          if (modulesStat) {
            modulesStat.count = allModules.length;
            modulesStat.details = allModules.map(module => ({
              name: module.moduleName,
              code: module.moduleCode,
              department: module.department || 'Unknown Department',
              level: module.moduleLevel
            }));
          }
  
          // Log the results for debugging
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