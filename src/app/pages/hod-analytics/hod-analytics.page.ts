// import { Component, OnInit } from '@angular/core';
// import { Chart, registerables } from 'chart.js';
// import { AngularFirestore } from '@angular/fire/compat/firestore';
// import { AngularFireAuth } from '@angular/fire/compat/auth';
// import { AuthenticationService } from '../../services/auths.service';

// interface Module {
//   moduleName: string;
//   moduleCode: string;
//   moduleLevel: string;
// }

// interface Stream {
//   modules: Module[];
//   name: string;
// }

// interface StreamMap {
//   [key: string]: Stream[];
// }

// interface Department {
//   name: string;
//   streams?: StreamMap;
//   modules?: Module[];
// }

// interface Faculty {
//   id: string;
//   departments: Department[];
// }

// interface User {
//   department: string;
//   faculty: string;
//   fullName: string;
//   email: string;
//   position: string;
//   staffNumber: string;
// }


// // interface ModuleInfo {
// //   moduleCode: string;
// //   moduleLevel: string;
// //   moduleName: string;
// // }

// // interface Stream {
// //   modules: {
// //     [key: string]: ModuleInfo;
// //   };
// // }

// // interface Department {
// //   modules?: {
// //     name: string;
// //   };
// //   streams?: {
// //     [streamName: string]: Stream;
// //   };
// // }
// // interface Module {
// //   name: string;
// //   code: string;
// //   level: string;
// // }




// @Component({
//   selector: 'app-hod-analytics',
//   templateUrl: './hod-analytics.page.html',
//   styleUrls: ['./hod-analytics.page.scss'],
// })
// export class HODANALYTICSPage implements OnInit {
//   staffData: User | null = null;
//   departmentModules: any[] = [];
//   loading: boolean = true;
//   error: string | null = null;
//   totalStudents: number = 0;
//   totalModules: number = 0;
//   attendanceChart: Chart | null = null;
//   moduleAttendance: { [key: string]: { [date: string]: number } } = {};
//   moduleMarks!: { [moduleCode: string]: { [studentNumber: string]: number; }; };
//   marksChart: any;

//   constructor(
//     private firestore: AngularFirestore,
//     private afAuth: AngularFireAuth,
//     private authService: AuthenticationService
//   ) {
//     Chart.register(...registerables);
//   }

//   async ngOnInit() {

//     try {
//       await this.initializeData();
//     } catch (error) {
//       console.error('Error in initialization:', error);
//       this.error = 'Failed to initialize data';
//     }

//   }

//   async initializeData() {

//     try {
//       this.staffData = await this.authService.getLoggedInStaff();
      
//       if (!this.staffData) {
//         throw new Error('Failed to retrieve staff data');
//       }

//       console.log('Staff Data Retrieved:', this.staffData);

//       await this.getDepartmentModules(this.staffData);
      
//       if (this.departmentModules.length > 0) {
//         await this.getAttendanceData();
//         this.createAttendanceChart();
//         await this.getAverageMarks();
//         this.createMarksPieChart();
//       }

//       this.loading = false;
//     } catch (error) {
//       console.error('Error:', error);
//       this.error = 'Failed to fetch data';
//       this.loading = false;
//       throw error;
//     }
//   }

// //All Modules
// async getDepartmentModules(staffInfo: User) {
//   try {
//     const facultyRef = this.firestore.collection('faculties').doc(staffInfo.faculty);
//     const facultyDoc = await facultyRef.get().toPromise();

//     if (!facultyDoc?.exists) {
//       console.error('Faculty not found:', staffInfo.faculty);
//       throw new Error(`Faculty "${staffInfo.faculty}" not found`);
//     }

//     const facultyData = facultyDoc.data() as Faculty;
//     console.log('Faculty Data:', facultyData);

//     if (!facultyData?.departments) {
//       console.error('No departments found in faculty document');
//       throw new Error(`No departments found for faculty "${staffInfo.faculty}"`);
//     }

//     this.departmentModules = []; 

 
//     for (const department of facultyData.departments) {
//       if (department.name === staffInfo.department) {
//         console.log('Matching Department:', department);

//         if (Array.isArray(department.modules)) {
//           console.log('Top-level Modules:', department.modules);
//           this.departmentModules.push(...department.modules.map((module) => ({
//             name: module.moduleName,
//             code: module.moduleCode,
//             level: module.moduleLevel
//           })));
//         } else {
//           console.warn('No top-level modules found in department');
//         }

//         if (department.streams) {
//           for (const streamName in department.streams) {
//             const stream = department.streams[streamName];
//             console.log('Processing stream:', streamName);

//             if (Array.isArray(stream)) {
//               for (const str of stream) {
            
//                 if (Array.isArray(str.modules)) {
//                   console.log('Modules in Stream:', str.modules);
//                   this.departmentModules.push(...str.modules.map((module) => ({
//                     name: module.moduleName,
//                     code: module.moduleCode,
//                     level: module.moduleLevel
//                   })));
//                 } else {
//                   console.warn(`No modules found in stream "${streamName}"`);
//                 }
//               }
//             } else {
//               console.warn(`Stream "${streamName}" is not an array.`);
//             }
//           }
//         } else {
//           console.warn('No streams found in department');
//         }
//       }
//     }

//     this.totalModules = this.departmentModules.length;
//     console.log(`All retrieved modules under department "${staffInfo.department}":`, this.departmentModules);

//     return this.departmentModules;

//   } catch (error) {
//     console.error('Error getting department modules:', error);
//     throw error;
//   }
// }

// //getting attendance 
// async getAttendanceData() {
//   try {
    
//     const moduleAttendance: { [moduleCode: string]: { [date: string]: number } } = {};

//     for (const module of this.departmentModules) {
//       const moduleCode = module.code; 
//       const attendanceDoc = await this.firestore
//         .collection('Attended')
//         .doc(moduleCode)
//         .get()
//         .toPromise();

//       if (attendanceDoc?.exists) {
//         const moduleData = attendanceDoc.data();
//         console.log(`Attendance data for module ${moduleCode}:`, moduleData);

//         moduleAttendance[moduleCode] = {}; 

//         if (moduleData && typeof moduleData === 'object') {
//           for (const [date, records] of Object.entries(moduleData)) {
//             if (Array.isArray(records)) {
//               moduleAttendance[moduleCode][date] = records.length; 
//             } else {
//               console.warn(`Expected records for ${date} to be an array but got:`, records);
//             }
//           }
//         } else {
//           console.warn(`No valid data found for module ${moduleCode}`);
//         }
//       } 
//     }

//     console.log('Module Attendance Data:', moduleAttendance);
    
//     this.moduleAttendance = moduleAttendance; 

//     this.createAttendanceChart();

//     return moduleAttendance;

//   } catch (error) {
//     console.error('Error getting attendance data:', error);
//     throw error;
//   }
// }


//   private getRandomColor(): string {
//     const letters = '0123456789ABCDEF';
//     let color = '#';
//     for (let i = 0; i < 6; i++) {
//       color += letters[Math.floor(Math.random() * 16)];
//     }
//     return color;
//   }

//   createAttendanceChart() {
//     const canvas = document.getElementById('attendanceChart') as HTMLCanvasElement;
//     if (!canvas) {
//         console.error('Attendance chart canvas not found!');
//         return;
//     }

//     if (this.attendanceChart) {
//         this.attendanceChart.destroy();
//     }

//     const filteredModules = Object.keys(this.moduleAttendance).filter(moduleCode => 
//         Object.keys(this.moduleAttendance[moduleCode]).length > 0
//     );

//     if (filteredModules.length === 0) {
//         console.error('No modules with attendance records to plot the chart!');
//         return;
//     }

//     const datasets = filteredModules.map(moduleCode => {
//         const attendanceCounts = Object.values(this.moduleAttendance[moduleCode]).map(value => {
//             // Convert value to number if it's a string; otherwise, keep it as a number
//             if (typeof value === 'string') {
//                 const numberValue = parseFloat(value);
//                 return !isNaN(numberValue) ? numberValue : 0; // Default to 0 if conversion fails
//             }
//             return value as number; // Explicitly cast to number if it's already of type number
//         });

//         const color = this.getRandomColor(); 
//         return {
//             label: moduleCode,
//             data: attendanceCounts, // Now attendanceCounts is guaranteed to be a number array
//             backgroundColor: color,
//             borderColor: color,
//             borderWidth: 1,
//         };
//     });

//     this.attendanceChart = new Chart(canvas, {
//         type: 'bar',
//         data: {
//             labels: filteredModules,
//             datasets, 
//         },
//         options: {
//             responsive: true,
//             plugins: {
//                 legend: {
//                     position: 'top',
//                 },
//                 title: {
//                     display: true,
//                     text: 'Module Attendance',
//                 },
//             },
//             scales: {
//                 x: {
//                     title: {
//                         display: true,
//                         text: 'Module Code', 
//                     },
//                     ticks: {
//                         autoSkip: false,
//                         maxRotation: 0,
//                         minRotation: 0,
//                     },
//                     grid: {
//                         display: false,
//                     },
//                 },
//                 y: {
//                     title: {
//                         display: true,
//                         text: 'Number of Students', 
//                     },
//                     beginAtZero: true,
                    
//                 },
//             },
//         },
//     });
// }

//   // pie-charts
//   createMarksPieChart() {
//     const canvas = document.getElementById('marksChart') as HTMLCanvasElement;
//     if (!canvas) {
//       console.error('Marks chart canvas not found!');
//       return;
//     }
  
//     if (this.marksChart) {
//       this.marksChart.destroy();
//     }
  
//     // Validate module marks data structure
//     const filteredModules = Object.keys(this.moduleMarks).filter(moduleCode =>
//       Object.keys(this.moduleMarks[moduleCode]).length > 0
//     );
  
//     if (filteredModules.length === 0) {
//       console.error('No modules with marks data to plot the chart!');
//       return;
//     }
  
//     // Calculate averages
//     const data = filteredModules.map(moduleCode => {
//       const totalMarks = Object.values(this.moduleMarks[moduleCode]).reduce((sum, mark) => sum + mark, 0);
//       const studentCount = Object.keys(this.moduleMarks[moduleCode]).length;
//       return totalMarks / studentCount;
//     });
  
//     const colors = filteredModules.map(() => this.getRandomColor());
  
//     try {
//       // Create the chart
//       this.marksChart = new Chart(canvas, {
//         type: 'pie',
//         data: {
//           labels: filteredModules,
//           datasets: [{
//             data,  
//             backgroundColor: colors,
//           }],
//         },
//         options: {
//           responsive: true,
//           plugins: {
//             legend: {
//               position: 'top',
//             },
//             title: {
//               display: true,
//               text: 'Average Marks Per Module',
//             },
//           },
//           onClick: (event, elements) => {
//             if (elements.length > 0) {
//               const clickedIndex = elements[0].index;
//               const clickedModule = filteredModules[clickedIndex];
//               this.displayStudentsForModule(clickedModule);
//             }
//           },
//         },
//       });
//     } catch (chartError) {
//       console.error("Error creating the pie chart:", chartError);
//     }
//   }
  
//   displayStudentsForModule(clickedModule: string) {
//     // Implement method functionality if needed
//     throw new Error('Method not implemented.');
//   }
  

//   //avarageTests

// averageMarks: { [moduleCode: string]: number } = {};

// async getAverageMarks() {
//   try {
//     const moduleMarks: { [moduleCode: string]: { [studentNumber: string]: number } } = {};
//     const averageMarks: { [moduleCode: string]: number } = {}; 

//     for (const module of this.departmentModules) {
//       const moduleCode = module.code;
//       const marksDoc = await this.firestore
//         .collection('marks')
//         .doc(moduleCode)
//         .get()
//         .toPromise();

//       if (marksDoc?.exists) {
//         const moduleData = marksDoc.data();
//         console.log(`Data for module ${moduleCode}:`, moduleData);

//         if (moduleData && typeof moduleData === 'object') {
//           moduleMarks[moduleCode] = {}; 

//           let totalMarks = 0;
//           let studentCount = 0;

//           for (const [studentNumber, studentData] of Object.entries(moduleData)) {
//             if (typeof studentData === 'number') {
//               moduleMarks[moduleCode][studentNumber] = studentData;
//               totalMarks += studentData;
//               studentCount++;
//             } else {
//               console.warn(`Unexpected data type for student ${studentNumber} in module ${moduleCode}:`, studentData);
//             }
//           }

//           const averageMark = studentCount > 0 ? totalMarks / studentCount : 0;
//           averageMarks[moduleCode] = averageMark; // Store the average in averageMarks
//           console.log(`Average mark for module ${moduleCode}:`, averageMark);
//         } else {
//           console.warn(`Unexpected structure for module ${moduleCode}:`, moduleData);
//         }
//       }
//     }

//     this.moduleMarks = moduleMarks;
//     this.averageMarks = averageMarks; 
//     console.log('Module marks data:', this.moduleMarks);
//     console.log('Average marks for each module:', this.averageMarks);

//     this.createMarksPieChart();

//   } catch (error) {
//     console.error('Error getting marks data:', error);
//     throw error;
//   }
// }

  
// }

import { Component, OnInit } from '@angular/core';
import { Chart, registerables, ChartConfiguration } from 'chart.js';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AuthenticationService } from '../../services/auths.service';
import { StudentMarks } from 'src/app/models/marks.model';

interface Module {
  moduleName: string;
  moduleCode: string;
  moduleLevel: string;
}

interface Department {
  name: string;
  streams?: StreamMap;
  modules?: Module[];
}

interface Faculty {
  id: string;
  departments: Department[];
}

interface User {
  department: string;
  faculty: string;
  fullName: string;
  email: string;
  position: string;
  staffNumber: string;
}

interface ModuleMarksRanges {
  [key: string]: {
    range0to49: number;
    range50to59: number;
    range60to69: number;
    range70to79: number;
    range80to100: number;
  };
}

interface Stream {
  modules: Module[];
  name: string;
}

interface StreamMap {
  [key: string]: Stream[];
}

interface Department {
  name: string;
  streams?: StreamMap;
  modules?: Module[];
}



@Component({
  selector: 'app-hod-analytics',
  templateUrl: './hod-analytics.page.html',
  styleUrls: ['./hod-analytics.page.scss'],
})
export class HODANALYTICSPage implements OnInit {
  staffData: User | null = null;
  departmentModules: Module[] = [];
  moduleAttendance: { [key: string]: { [date: string]: number } } = {};
  moduleMarksRanges: ModuleMarksRanges = {};
  attendanceChart: Chart | null = null;
  marksChart: Chart<'pie', number[], string> | null = null;

  constructor(
    private firestore: AngularFirestore,
    private afAuth: AngularFireAuth,
    private authService: AuthenticationService
  ) {
    Chart.register(...registerables);
  }

  async ngOnInit() {
    try {
      await this.initializeData();
    } catch (error) {
      console.error('Error in initialization:', error);
    }
  }

  async initializeData() {
    this.staffData = await this.authService.getLoggedInStaff();
    if (!this.staffData) throw new Error('Failed to retrieve staff data');

    await this.getDepartmentModules(this.staffData);
    if (this.departmentModules.length > 0) {
      await Promise.all([this.getAttendanceData(), this.getModuleMarksRanges()]);
      this.createAttendanceChart();
      this.createMarksRangeChart();
    }
  }

  async getDepartmentModules(staffInfo: User) {
    const facultyRef = this.firestore.collection('faculties').doc(staffInfo.faculty);
    const facultyDoc = await facultyRef.get().toPromise();

    if (!facultyDoc?.exists) throw new Error(`Faculty "${staffInfo.faculty}" not found`);
    const facultyData = facultyDoc.data() as Faculty;

    for (const department of facultyData.departments) {
      if (department.name === staffInfo.department) {
        if (department.modules) this.departmentModules.push(...department.modules);
        if (department.streams) {
          for (const streams of Object.values(department.streams)) {
            for (const stream of streams) {
              this.departmentModules.push(...stream.modules);
            }
          }
        }
      }
    }
  }

  async getAttendanceData() {
    for (const module of this.departmentModules) {
      const attendanceDoc = await this.firestore.collection('Attended').doc(module.moduleCode).get().toPromise();
      if (attendanceDoc?.exists) {
        const attendanceData = attendanceDoc.data();
        this.moduleAttendance[module.moduleCode] = {};
        for (const [date, students] of Object.entries(attendanceData || {})) {
          if (Array.isArray(students)) {
            this.moduleAttendance[module.moduleCode][date] = students.length;
          }
        }
      }
    }
  }
  
  async getModuleMarksRanges() {
    for (const module of this.departmentModules) {
      const marksDoc = await this.firestore.collection('marks').doc(module.moduleCode).get().toPromise();
      if (marksDoc?.exists) {
        const marksData = marksDoc.data() as { marks: StudentMarks[] };
        
        const ranges = {
          range0to49: 0,
          range50to59: 0,
          range60to69: 0,
          range70to79: 0,
          range80to100: 0,
        };
  
        if (marksData?.marks) {
          marksData.marks.forEach((studentMarks: StudentMarks) => {
            const tests = [
              studentMarks.test1, studentMarks.test2, studentMarks.test3,
              studentMarks.test4, studentMarks.test5, studentMarks.test6, studentMarks.test7
            ].filter(mark => typeof mark === 'number') as number[];
  
            tests.forEach(mark => {
              if (mark < 50) ranges.range0to49++;
              else if (mark < 60) ranges.range50to59++;
              else if (mark < 70) ranges.range60to69++;
              else if (mark < 80) ranges.range70to79++;
              else ranges.range80to100++;
            });
          });
        }
  
        this.moduleMarksRanges[module.moduleCode] = ranges;
      }
    }
  }
  

  createAttendanceChart() {
    const canvas = document.getElementById('attendanceChart') as HTMLCanvasElement;
    if (!canvas) return;

    const labels = Object.keys(this.moduleAttendance);
    const datasets = labels.map(moduleCode => {
      const averageAttendance = Object.values(this.moduleAttendance[moduleCode]).reduce((sum, val) => sum + val, 0);
      return { label: moduleCode, data: [averageAttendance], backgroundColor: this.getRandomColor() };
    });

    this.attendanceChart = new Chart(canvas, {
      type: 'bar',
      data: { labels: ['Average Attendance'], datasets },
      options: {
        responsive: true,
        plugins: { legend: { position: 'top' }, title: { display: true, text: 'Module Attendance' } },
        scales: { y: { beginAtZero: true, title: { display: true, text: 'Number of Students' } } },
      },
    });
  }

  createMarksRangeChart() {
    const canvas = document.getElementById('marksChart') as HTMLCanvasElement;
    if (!canvas) return;

    const moduleCode = Object.keys(this.moduleMarksRanges)[0]; // Show the first module initially
    const ranges = this.moduleMarksRanges[moduleCode];

    this.marksChart = new Chart(canvas, {
      type: 'pie',
      data: {
        labels: ['0-49%', '50-59%', '60-69%', '70-79%', '80-100%'],
        datasets: [{
          data: [
            ranges.range0to49,
            ranges.range50to59,
            ranges.range60to69,
            ranges.range70to79,
            ranges.range80to100,
          ],
          backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'],
        }],
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'top' }, title: { display: true, text: `Mark Distribution for ${moduleCode}` } },
      },
    } as ChartConfiguration<'pie', number[], string>);
  }

  private getRandomColor(): string {
    return '#' + Math.floor(Math.random() * 16777215).toString(16);
  }
}
