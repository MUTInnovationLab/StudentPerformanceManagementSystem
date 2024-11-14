import { Component, OnInit } from '@angular/core';
import { Chart, registerables, ChartConfiguration } from 'chart.js';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AuthenticationService } from '../../services/auths.service';
import { StudentMarks } from 'src/app/models/marks.model';
import { ChangeDetectorRef } from '@angular/core';
import { IonSelectCustomEvent } from '@ionic/core';

interface ModuleRange {
  range: string;
  modules: Array<{
    code: string;
    average: number;
  }>;
}

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
interface AssignedLecture {
  userEmail: string; 
}

@Component({
  selector: 'app-hod-analytics',
  templateUrl: './hod-analytics.page.html',
  styleUrls: ['./hod-analytics.page.scss'],
})
export class HODANALYTICSPage implements OnInit {
  moduleRanges: {
    '0-49': ModuleRange;
    '50-59': ModuleRange;
    '60-69': ModuleRange;
    '70-79': ModuleRange;
    '80-100': ModuleRange;
  } = {
    '0-49': { range: '0-49%', modules: [] },
    '50-59': { range: '50-59%', modules: [] },
    '60-69': { range: '60-69%', modules: [] },
    '70-79': { range: '70-79%', modules: [] },
    '80-100': { range: '80-100%', modules: [] }
  };
  moduleAttendance: { [key: string]: { [date: string]: number } } = {};  
  marksChart: Chart | null = null;
  departmentModules: any[] = []; 
  attendanceChart: Chart | null = null;
  staffData: User | null = null;
  selectedRange: string = '50-59';
moduleDetailsData: any[] = [];
isLoading: boolean = false;

  constructor(
    private firestore: AngularFirestore,
    private authService: AuthenticationService,
    private cdr: ChangeDetectorRef
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
      await Promise.all([this.getAttendanceData(), this.getModuleAverages()]);
      this.createAttendanceChart();
      this. createMarksChart();
    }
    this.cdr.detectChanges();
  }

  async getDepartmentModules(staffInfo: any) {
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
    this.cdr.detectChanges();
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
    this.cdr.detectChanges();
  }

  async onRangeChange(event: any) {
    this.isLoading = true;
    try {
      this.selectedRange = event.detail.value;
      const rangeKey = this.selectedRange as keyof typeof this.moduleRanges;
      const modulesInRange = this.moduleRanges[rangeKey].modules;
      const modulesCodes = modulesInRange.map(m => m.code);
  
      // Get the module details for the selected range
      this.moduleDetailsData = await this.getModuleDetailsForRange(modulesCodes);
    } catch (error) {
      console.error('Error fetching module details:', error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }
  
  
  
  async getModuleDetailsForRange(modulesCodes: string[]) {
    const moduleDetails = [];
  
    for (const moduleCode of modulesCodes) {
      // Find the module details from departmentModules
      const moduleData = this.departmentModules.find(m => m.moduleCode === moduleCode);
  
      if (moduleData) {
        moduleDetails.push({
          moduleCode: moduleData.moduleCode,
          moduleName: moduleData.moduleName,
          moduleLevel: moduleData.moduleLevel || '' // Ensure safe access
        });
      }
    }
  
    return moduleDetails;
  }
  
 

  async getModuleAverages() {
    // Use departmentModules instead of getting from enrolledModules
    for (const module of this.departmentModules) {
      const moduleCode = module.moduleCode;
      const marksDoc = await this.firestore
        .collection('marks')
        .doc(moduleCode)
        .get()
        .toPromise();

      if (marksDoc?.exists) {
        const marksData = marksDoc.data() as { marks: StudentMarks[] };
        
        if (marksData?.marks && marksData.marks.length > 0) {
          // Calculate module average from all students' averages
          let totalAverage = 0;
          let studentCount = 0;

          marksData.marks.forEach(studentMark => {
            if (studentMark.average) {
              totalAverage += parseFloat(studentMark.average);
              studentCount++;
            }
          });

          if (studentCount > 0) {
            const moduleAverage = totalAverage / studentCount;
            
            // Add to appropriate range
            if (moduleAverage < 50) {
              this.moduleRanges['0-49'].modules.push({ code: moduleCode, average: moduleAverage });
            } else if (moduleAverage < 60) {
              this.moduleRanges['50-59'].modules.push({ code: moduleCode, average: moduleAverage });
            } else if (moduleAverage < 70) {
              this.moduleRanges['60-69'].modules.push({ code: moduleCode, average: moduleAverage });
            } else if (moduleAverage < 80) {
              this.moduleRanges['70-79'].modules.push({ code: moduleCode, average: moduleAverage });
            } else {
              this.moduleRanges['80-100'].modules.push({ code: moduleCode, average: moduleAverage });
            }
          }
        }
      }
    }
    
    this.cdr.detectChanges();
  }

  

  createMarksChart() {
    const canvas = document.getElementById('marksChart') as HTMLCanvasElement;
    if (!canvas) return;

    if (this.marksChart) {
      this.marksChart.destroy();
    }

    const chartData = [
      this.moduleRanges['0-49'].modules.length,
      this.moduleRanges['50-59'].modules.length,
      this.moduleRanges['60-69'].modules.length,
      this.moduleRanges['70-79'].modules.length,
      this.moduleRanges['80-100'].modules.length,
    ];

    const labels = ['0-49%', '50-59%', '60-69%', '70-79%', '80-100%'];
    const colors = ['#FF6384', '#FF9F40', '#FFCD56', '#4BC0C0', '#36A2EB'];

     new Chart(canvas, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: chartData,
          backgroundColor: colors,
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const rangeKey = labels[context.dataIndex].slice(0, -1) as keyof typeof this.moduleRanges;
                const modules = this.moduleRanges[rangeKey].modules;
                const modulesList = modules.map(m => 
                  `${m.code} (${m.average.toFixed(1)}%)`
                ).join(', ');
                return [
                  `Range: ${labels[context.dataIndex]}`,
                  `Modules: ${modulesList || 'None'}`,
                  `Count: ${modules.length}`
                ];
              }
            }
          },
          title: {
            display: true,
            text: 'Module Averages Distribution'
          }
        }
      }
    });
    
    this.cdr.detectChanges();
  }

    createAttendanceChart() {
    setTimeout(() => {
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
    this.cdr.detectChanges();
  },150);

  }

    private getRandomColor(): string {
    this.cdr.detectChanges();
    return '#' + Math.floor(Math.random() * 16777215).toString(16);
    
  }
}