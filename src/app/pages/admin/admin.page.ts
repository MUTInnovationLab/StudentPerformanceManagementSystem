import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { AngularFirestore, QuerySnapshot, DocumentData } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import { combineLatest, forkJoin, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PopoverController } from '@ionic/angular';
import { ProfileComponent } from '../../components/profile/profile.component';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AlertController, AlertInput } from '@ionic/angular';
import { LoadingController } from '@ionic/angular';
import { DomSanitizer } from '@angular/platform-browser';


type ValidInputTypes = 'text' | 'number' | 'email' | 'tel' | 'password' | 'date' | 'textarea' | 'checkbox' | 'radio';

interface BaseItem {
  id: string;
  name: string;
  email: string;
  position?: string;
  collection?: string; // Added to track which collection the item belongs to
  [key: string]: any;
}
interface Attendance {
  studentId: string;
}



interface UpdatedData {
  id?: string;
  collection?: string;
  [key: string]: any;
}
// Add these interfaces to your existing interfaces
interface Module {
  moduleCode: string;
  moduleName: string;
  moduleLevel: string;
  department: string;
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
interface AcademicStats {
  passingRate: number;
  attendanceRate: number;
  mentorsPercentage: number;
  studentsPercentage: number;
  staffPercentage: number; // Add this line
  attendancePercentage: number;
  lecturesPercentage: number;
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
  searchQuery: string = '';
  searchTimeout: any;
  isLoggedIn: boolean = false;
  private readonly validCollections = ['staff', 'mentors', 'students', 'faculties', 'courses', 'modules', 'departments'];

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
  academicStats: AcademicStats = {
    passingRate: 0,
    attendanceRate: 0,
    mentorsPercentage: 0,
    studentsPercentage: 0,
    staffPercentage: 0, // Include this
    attendancePercentage: 0,
    lecturesPercentage: 0
  };
  constructor(private router: Router, private firestore: AngularFirestore,private popoverController: PopoverController,private auth: AngularFireAuth,    private alertController: AlertController,
  private loadingController: LoadingController,private sanitizer: DomSanitizer,  private cd: ChangeDetectorRef,


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
    this.fetchAttendanceRate();
    this.fetchFacultiesData(); 
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
      if (collection === 'faculties') {
        // Find the faculty document containing the item
        const facultySnapshot = await this.firestore.collection('faculties')
          .get()
          .toPromise();
  
        for (const doc of facultySnapshot!.docs) {
          const facultyData = doc.data() as FacultyDocument;
          
          // Check modules
          if (cleanData['moduleCode']) {
            const moduleIndex = facultyData.modules?.findIndex(
              m => m.moduleCode === item.id
            );
            
            if (moduleIndex !== -1) {
              const updatePath = `modules.${moduleIndex}`;
              await this.firestore.collection('faculties').doc(doc.id).update({
                [updatePath]: cleanData
              });
              return true;
            }
          }
          
          // Check departments
          if (cleanData['streams'] !== undefined) {
            const departmentIndex = facultyData.departments?.findIndex(
              d => d.name === item.id
            );
            
            if (departmentIndex !== -1) {
              const updatePath = `departments.${departmentIndex}`;
              await this.firestore.collection('faculties').doc(doc.id).update({
                [updatePath]: cleanData
              });
              return true;
            }
          }
        }
        
        throw new Error('Item not found in any faculty');
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
    if (item['moduleCode']) {
      return 'faculties';  // Modules are nested in faculties
    }
    if (item['streams']) {
      return 'faculties';  // Departments are nested in faculties
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
      'Faculties': 'faculties',
      'Courses': 'faculties', // Courses are nested in faculties
      'Modules': 'faculties', // Modules are nested in faculties
      'Departments': 'faculties' // Departments are nested in faculties
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
  
  // In your admin.page.ts file

// Update the fetchModules method to be more robust
fetchModules() {
  const modulesStat = this.stats.find(stat => stat.title === 'Modules');

  this.firestore.collection('faculties')
    .get()
    .subscribe({
      next: (snapshot) => {
        const uniqueModulesMap = new Map<string, Module>();

        snapshot.docs.forEach(doc => {
          const facultyData = doc.data() as any;

          if (facultyData.departments && Array.isArray(facultyData.departments)) {
            facultyData.departments.forEach((department: any) => {
              if (department.modules && Array.isArray(department.modules)) {
                this.addModulesToMap(department.modules, uniqueModulesMap, department.name);
              }

              if (department.streams && typeof department.streams === 'object') {
                Object.values(department.streams).forEach((streamArray: any) => {
                  if (Array.isArray(streamArray)) {
                    streamArray.forEach((stream: any) => {
                      if (stream.modules && Array.isArray(stream.modules)) {
                        this.addModulesToMap(stream.modules, uniqueModulesMap, stream.name);
                      }
                    });
                  }
                });
              }
            });
          }
        });

        // Convert unique modules to a sorted array
        this.modules = Array.from(uniqueModulesMap.values()).sort((a, b) =>
          a.moduleCode.localeCompare(b.moduleCode)
        );

        // Update module statistics
        if (modulesStat) {
          modulesStat.count = this.modules.length; // Total unique modules
          modulesStat.details = this.modules.map(module => ({
            name: module.moduleName,
            code: module.moduleCode,
            department: module.department,
            level: module.moduleLevel
          }));
        }

        console.log('Total unique modules found:', this.modules.length);
        console.log('Unique modules:', this.modules);
      },
      error: (error) => {
        console.error('Error fetching modules from faculties collection:', error);
      }
    });
}


private addModulesToMap(modules: any[], map: Map<string, Module>, departmentName: string) {
  modules.forEach(moduleData => {
    if (moduleData.moduleCode && !map.has(moduleData.moduleCode)) {
      map.set(moduleData.moduleCode, {
        moduleCode: moduleData.moduleCode,
        moduleName: moduleData.moduleName || 'Unknown Module Name',
        moduleLevel: moduleData.moduleLevel || 'Unknown Level',
        department: departmentName || 'Unknown Department'
      });
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
            
            // Map departments and ensure streams are captured
            const departmentsWithStreams = facultyData.departments.map(department => ({
              name: department.name,
              streams: department.streams || [], // Ensure streams are always an array
              modules: department.modules || [] // Optional: include modules if needed
            }));

            allDepartments.push(...departmentsWithStreams);
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

        this.departments = allDepartments; // Store departments for potential further use

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
        const courses: DetailItem[] = [];
        const moduleSet = new Set<string>();
  
        snapshot.docs.forEach(doc => {
          const faculty = doc.data() as Faculty;
          
          // Collect modules from faculty-level modules
          if (faculty.modules && Array.isArray(faculty.modules)) {
            faculty.modules.forEach(module => {
              moduleSet.add(module.moduleName);
            });
          }
  
          // Check if faculty has departments
          if (faculty.departments && Array.isArray(faculty.departments)) {
            faculty.departments.forEach(department => {
              // Collect modules from department-level modules
              const departmentModules = department.modules?.map(module => module.moduleName) || [];
              departmentModules.forEach(moduleName => moduleSet.add(moduleName));
  
              // Create a course entry with modules
              const courseEntry: DetailItem = {
                name: department.name,
                modules: Array.from(moduleSet)
              };
              courses.push(courseEntry);
            });
          }
        });
        
        if (coursesStat) {
          coursesStat.count = courses.length;
          coursesStat.details = courses;
        }
  
        console.log('Total unique modules found:', moduleSet.size);
        console.log('Modules:', Array.from(moduleSet));
      });
  }
  isFacultyModuleCourseOrDepartment(title: string | undefined): boolean {
  const excludedTitles = ['Faculties', 'Modules', 'Courses', 'Departments'];
  return title ? excludedTitles.includes(title) : false;
}

  
showCardDetails(card: StatCard) {
  this.clearSearch();
  this.selectedCard = card;
  this.showDetails = true;
}
  
  closeDetails() {
    this.showDetails = false;
    this.selectedCard = null;
    this.searchQuery = ''; // Clear search when modal closes
  }
  filteredDetails(): DetailItem[] {
    // Check if the details array exists and is an array
    if (!this.selectedCard?.details || !Array.isArray(this.selectedCard.details)) {
      console.log('No details found or invalid details array');
      return [];
    }
  
    // If no search query, return all details
    if (!this.searchQuery.trim()) {
      console.log('No search query provided, returning all details');
      return this.selectedCard.details;
    }
  
    const query = this.searchQuery.toLowerCase().trim();
    console.log('Search Query:', query);
  
    // Filter all items in the details array
    const filtered = this.selectedCard.details.filter((item: DetailItem) => {
      // Check if any value in the item matches the query
      const isMatch = Object.values(item).some(value => {
        // If the value is an array, check each element
        if (Array.isArray(value)) {
          const matchInArray = value.some((v: unknown) => v?.toString().toLowerCase().includes(query));
          console.log('Array match found:', matchInArray, 'For value:', value);
          return matchInArray;
        }
        // Check if the value (converted to string) contains the query
        const match = value?.toString().toLowerCase().includes(query);
        console.log('Value match found:', match, 'For value:', value);
        return match;
      });
      
      console.log('Item:', item, 'Matches:', isMatch);
      return isMatch;
    });
  
    console.log('Filtered Results:', filtered);
    return filtered;
  }
  
  
  
  onSearchChange(event: any): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    this.searchTimeout = setTimeout(() => {
      this.searchQuery = event.target.value;
    }, 300); // 300ms debounce
  }
  getKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }
  clearSearch(): void {
    this.searchQuery = '';
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }
  getSearchPlaceholder(): string {
    if (!this.selectedCard) return 'Search...';
    
    const placeholders: { [key: string]: string } = {
      'Lecturers': 'Search by name, email, or department...',
      'Mentors': 'Search by name, email, or specialization...',
      'Students': 'Search by name, number, or course...',
      'Courses': 'Search by course name or department...',
      'Modules': 'Search by module code or name...',
      'Departments': 'Search by department name...',
      'HODs': 'Search by name or department...',
      'Faculties': 'Search by faculty name...'
    };

    return placeholders[this.selectedCard.title] || 'Search...';
  }

  // Helper method to highlight search matches
  highlightMatch(text: string): string {
    if (!this.searchQuery.trim() || !text) {
      return text;
    }

    const query = this.searchQuery.toLowerCase();
    const textLower = text.toLowerCase();
    const index = textLower.indexOf(query);

    if (index === -1) {
      return text;
    }

    const highlighted = text.slice(0, index) +
      `<mark>${text.slice(index, index + query.length)}</mark>` +
      text.slice(index + query.length);

    return this.sanitizer.bypassSecurityTrustHtml(highlighted) as string;
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
  fetchAttendanceRate(): void {
    console.log('Fetching attendance rate...');
  
    forkJoin({
      totalStudents: this.firestore.collection('students').valueChanges(),
      attendanceData: this.firestore.collection('Attended').valueChanges()
    }).subscribe({
      next: (results) => {
        const totalStudents = results.totalStudents as any[];
        const attendanceData = results.attendanceData as any[];
  
        // Log fetched data
        console.log('Raw Students Collection Data:', totalStudents);
        console.log('Raw Attended Collection Data:', attendanceData);
  
        // Normalize student numbers from 'students' collection
        const studentNumbers = totalStudents
          .map(student => student.studentNumber?.toString().trim().toLowerCase())
          .filter(Boolean); // Remove undefined/null values
        console.log('Normalized Student Numbers:', studentNumbers);
  
        // Normalize student numbers from 'Attended' collection
        const attendedStudentNumbers = attendanceData
          .map(attendance => attendance.studentNumber?.toString().trim().toLowerCase())
          .filter(Boolean); // Remove undefined/null values
        console.log('Normalized Attended Student Numbers:', attendedStudentNumbers);
  
        // Find unique attended student numbers that match the students list
        const uniqueAttendedStudentNumbers = new Set(
          attendedStudentNumbers.filter(number => studentNumbers.includes(number))
        );
        console.log('Matching Attended Student Numbers:', Array.from(uniqueAttendedStudentNumbers));
  
        // Calculate counts
        const totalStudentsCount = studentNumbers.length;
        const attendedStudentsCount = uniqueAttendedStudentNumbers.size;
  
        console.log(`Total Students Count: ${totalStudentsCount}`);
        console.log(`Attended Students Count: ${attendedStudentsCount}`);
  
        // Calculate attendance rate
        const attendanceRate = totalStudentsCount > 0
          ? (attendedStudentsCount / totalStudentsCount) * 100
          : 0;
        this.academicStats.attendanceRate = Math.round(attendanceRate * 10) / 10;
  
        console.log(`Attendance Rate: ${this.academicStats.attendanceRate}%`);
  
        // Trigger change detection
        this.cd.detectChanges();
      },
      error: (error) => {
        console.error('Error fetching attendance data:', error);
        this.academicStats.attendanceRate = 0;
  
        // Trigger change detection
        this.cd.detectChanges();
      }
    });
  }
  
  
  // Fetch the total count of mentors from Firestore
  fetchMentorsCount(): void {
    // Use valueChanges() to get staff with their lecture details
    const staffCollection$ = this.firestore.collection('staff', ref => 
      ref.where('hasLectures', '==', true)
    ).valueChanges();
  
    // Combine with other collections
    combineLatest({
      mentors: this.firestore.collection('mentors').valueChanges(),
      students: this.firestore.collection('students').valueChanges(),
      staff: this.firestore.collection('staff').valueChanges(),
      staffWithLectures: staffCollection$,
      attendanceData: this.firestore.collection('Attended').valueChanges()
    }).pipe(
      map(results => {
        // Normalize attendance data
        const totalStudents = results.students as any[];
        const attendanceData = results.attendanceData as any[];
  
        const studentNumbers = totalStudents
          .map(student => student.studentNumber?.toString().trim().toLowerCase())
          .filter(Boolean);
  
        const attendedStudentNumbers = attendanceData
          .map(attendance => attendance.studentNumber?.toString().trim().toLowerCase())
          .filter(Boolean);
  
        const uniqueAttendedStudentNumbers = new Set(
          attendedStudentNumbers.filter(number => studentNumbers.includes(number))
        );
  
        const totalStudentsCount = studentNumbers.length;
        const attendedStudentsCount = uniqueAttendedStudentNumbers.size;
  
        // Calculate attendance rate
        const attendanceRate = totalStudentsCount > 0
          ? (attendedStudentsCount / totalStudentsCount) * 100
          : 0;
  
        return {
          mentorCount: results.mentors.length,
          studentsCount: totalStudentsCount,
          staffCount: results.staff.length,
          staffWithLecturesCount: results.staffWithLectures.length,
          attendanceRate
        };
      })
    ).subscribe({
      next: (counts) => {
        const { 
          mentorCount, 
          studentsCount, 
          staffCount, 
          staffWithLecturesCount, 
          attendanceRate 
        } = counts;
  
        // Total population for percentage calculation
        const totalPopulation = mentorCount + studentsCount + staffCount;
  
        if (totalPopulation > 0) {
          // Calculate percentages
          const mentorsPercentage = (mentorCount / totalPopulation) * 100;
          const studentsPercentage = (studentsCount / totalPopulation) * 100;
          const staffPercentage = (staffCount / totalPopulation) * 100;
  
          // Calculate Lectures Percentage based on staff with lectures
          const lecturesPercentage = staffCount > 0 
            ? (staffWithLecturesCount / staffCount) * 100 
            : 0;
  
          // Round all percentages to one decimal place
          this.academicStats.mentorsPercentage = Math.round(mentorsPercentage * 10) / 10;
          this.academicStats.studentsPercentage = Math.round(studentsPercentage * 10) / 10;
          this.academicStats.staffPercentage = Math.round(staffPercentage * 10) / 10;
          this.academicStats.lecturesPercentage = Math.round(lecturesPercentage * 10) / 10;
          this.academicStats.attendanceRate = Math.round(attendanceRate * 10) / 10;
  
          // Update the Mentors stat card count
          const mentorStat = this.stats.find(stat => stat.title === 'Mentors');
          if (mentorStat) {
            mentorStat.count = mentorCount;
          }
  
          // Log results
          console.log(`Mentors Percentage: ${this.academicStats.mentorsPercentage}%`);
          console.log(`Students Percentage: ${this.academicStats.studentsPercentage}%`);
          console.log(`Staff Percentage: ${this.academicStats.staffPercentage}%`);
          console.log(`Lectures Percentage: ${this.academicStats.lecturesPercentage}%`);
          console.log(`Attendance Rate: ${this.academicStats.attendanceRate}%`);
          console.log(`Total Staff: ${staffCount}`);
          console.log(`Staff with Lectures: ${staffWithLecturesCount}`);
        } else {
          // Reset percentages if no population data
          this.academicStats.mentorsPercentage = 0;
          this.academicStats.studentsPercentage = 0;
          this.academicStats.staffPercentage = 0;
          this.academicStats.lecturesPercentage = 0;
          this.academicStats.attendanceRate = 0;
          console.log('No population data found');
        }
      },
      error: (error) => {
        console.error("Error fetching mentor and lecture count:", error);
        this.academicStats.mentorsPercentage = 0;
        this.academicStats.studentsPercentage = 0;
        this.academicStats.staffPercentage = 0;
        this.academicStats.lecturesPercentage = 0;
        this.academicStats.attendanceRate = 0;
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
    // Fetch total staff and lecturers
    combineLatest({
      totalStaff: this.firestore.collection('staff').valueChanges(),
      lecturers: this.firestore.collection('staff', ref => ref.where('position', '==', 'Lecturer')).valueChanges()
    }).subscribe({
      next: (results) => {
        const totalStaffCount = results.totalStaff.length;
        const lecturerCount = results.lecturers.length;
  
        // Calculate lecturer percentage
        const lecturesPercentage = totalStaffCount > 0 
          ? (lecturerCount / totalStaffCount) * 100 
          : 0;
  
        // Update lecturer stat card
        const lecturerStat = this.stats.find(stat => stat.title === 'Lecturers');
        if (lecturerStat) {
          lecturerStat.count = lecturerCount;
        }
  
        // Update lectures percentage in academic stats
        this.academicStats.lecturesPercentage = Math.round(lecturesPercentage * 10) / 10;
  
        console.log(`Total Staff: ${totalStaffCount}`);
        console.log(`Lecturer Count: ${lecturerCount}`);
        console.log(`Lectures Percentage: ${this.academicStats.lecturesPercentage}%`);
      },
      error: (error) => {
        console.error("Error fetching lecturer count:", error);
        
        // Reset lectures percentage in case of error
        this.academicStats.lecturesPercentage = 0;
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