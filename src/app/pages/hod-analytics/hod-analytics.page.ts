import { Component, OnInit } from '@angular/core';
import { Chart, registerables} from 'chart.js';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AuthenticationService } from '../../services/auths.service';
import { StudentMarks } from 'src/app/models/marks.model';
import { ChangeDetectorRef } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { ModalController } from '@ionic/angular';
import {ModuleRange, Faculty,User, Student,  AssignedLectures,MarksData  } from '../../models/hod.model';

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
 expandedRowIndex: number | null = null;
 studentDetails: any[] = []; 
 failingStudentsDetails: Array<Student & { average: number }> = []; 
isCardVisible = false; 
 

  constructor(
    private firestore: AngularFirestore,
    private authService: AuthenticationService,
    private cdr: ChangeDetectorRef,
    private alertController: AlertController,
    private modalController: ModalController
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

  async toggleRow(index: number) {
    if (this.expandedRowIndex === index) {
      this.expandedRowIndex = null; 
      return;
    }
    this.expandedRowIndex = index;

    const moduleData = this.moduleDetailsData[index];
    if (!moduleData.lecturerDetails) {
      try {
        // Fetch lecturer details if not already loaded
        const lecturerDoc = await this.firestore
          .collection('staff')
          .doc(moduleData.staffNumber)
          .get()
          .toPromise();

        if (lecturerDoc?.exists) {
          const lecturerData = lecturerDoc.data() as { fullName: string; email: string };
          moduleData.lecturerDetails = lecturerData;
        } else {
          moduleData.lecturerDetails = {
            fullName: 'Not Assigned',
            email: 'N/A',
          };
        }
      } catch (error) {
        console.error('Error fetching lecturer details:', error);
        moduleData.lecturerDetails = {
          fullName: 'Error',
          email: 'Failed to load details',
        };
      }
    }
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
  async getModuleDetailsForRange(modulesCodes: string[]) {
    const moduleDetails = [];
  
    for (const moduleCode of modulesCodes) {
      const moduleData = this.departmentModules.find(m => m.moduleCode === moduleCode);
      if (moduleData) {
        // Fetch all documents in `assignedLectures` collection
        const assignedLecturesSnapshot = await this.firestore
          .collection('assignedLectures')
          .get()
          .toPromise();
  
        let staffNumber: string | null = null;
  
        // Iterate through documents to find the matching `moduleCode`
        assignedLecturesSnapshot?.docs.forEach(doc => {
          const data = doc.data() as AssignedLectures; 
          if (data.modules?.some(module => module.moduleCode === moduleCode)) {
            staffNumber = doc.id; 
          }
        });
  
        moduleDetails.push({
          moduleCode: moduleData.moduleCode,
          moduleName: moduleData.moduleName,
          moduleLevel: moduleData.moduleLevel || '',
          staffNumber: staffNumber,
        });
      }
    }
  
    console.log('Module Details:', moduleDetails); 
    return moduleDetails;
  }
  async showLecturerDetails(moduleData: any) {
    if (!moduleData.staffNumber) {
      const alert = await this.alertController.create({
        header: 'No Lecturer Assigned',
        message: 'No lecturer is currently assigned to this module.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }
  
    try {
      // Fetch lecturer details using `staffNumber`
      const lecturerDoc = await this.firestore
        .collection('staff')
        .doc(moduleData.staffNumber)
        .get()
        .toPromise();
  
      if (!lecturerDoc?.exists) {
        const alert = await this.alertController.create({
          header: 'Lecturer Not Found',
          message: 'Could not find lecturer details.',
          buttons: ['OK']
        });
        await alert.present();
        return;
      }
  
      const lecturerData = lecturerDoc.data() as { fullName: string; email: string };
  
      const alert = await this.alertController.create({
        header: 'Lecturer Details',
        message: `
          <strong>Name:</strong> ${lecturerData.fullName}<br>
          <strong>Email:</strong> ${lecturerData.email}<br>
        `,
        buttons: ['Close']
      });
      await alert.present();
    } catch (error) {
      console.error('Error fetching lecturer details:', error);
      const alert = await this.alertController.create({
        header: 'Lecturer Details',
        message: 'No lecturer found',
        buttons: ['OK']
      });
      await alert.present();
    }
  }
  
async showFailingStudents(moduleData: any) {
  if (!moduleData.moduleCode) {
    const alert = await this.alertController.create({
      header: 'Error',
      message: 'Module code is missing for this row.',
      buttons: ['OK'],
    });
    await alert.present();
    return;
  }
  try {
    const moduleDoc = await this.firestore
      .collection('marks')
      .doc(moduleData.moduleCode)
      .get()
      .toPromise();
    if (!moduleDoc?.exists) {
      const alert = await this.alertController.create({
        header: 'No Data',
        message: 'No marks data available for this module.',
        buttons: ['OK'],
      });
      await alert.present();
      return;
    }
    const marksData = moduleDoc.data() as MarksData;
    console.log('marksData:', marksData);
    // Get students with average below 45
    const failingStudents = Object.values(marksData.marks || [])
      .filter((student: any) => student.average && student.average < 45)
      .map((student: any) => ({
        studentNumber: student.studentNumber,
        average: student.average,
      }));
    console.log('failingStudents:', failingStudents);
    if (failingStudents.length === 0) {
      const alert = await this.alertController.create({
        header: 'No Students',
        message: 'No students found with an average below 45%.',
        buttons: ['OK'],
      });
      await alert.present();
      this.isCardVisible = false;
      return;
    }
    // Fetch student details for each failing student
    const studentDetailsPromises = failingStudents.map((student) =>
      this.firestore
        .collection('students')
        .doc(student.studentNumber.toString())  
        .get()
        .toPromise()
    );
    const studentDocs = await Promise.all(studentDetailsPromises);
    console.log('studentDocs:', studentDocs);
    this.failingStudentsDetails = studentDocs
      .map((doc, index) => {
        if (doc?.exists) {
          const studentData = doc.data() as Student;
          return {
            studentNumber: failingStudents[index].studentNumber,
            average: failingStudents[index].average,
            name: studentData.name || 'No Name',    
            surname: studentData.surname || 'No Surname', 
            email: studentData.email || 'No Email', 
          };
        }
        return null;
      })
      .filter((student) => student !== null) as Array<Student & { average: number }>;

    console.log('failingStudentsDetails:', this.failingStudentsDetails);

    this.isCardVisible = true; 
  } catch (error) {
    console.error('Error fetching failing students:', error);
    const alert = await this.alertController.create({
      header: 'Error',
      message: 'Failed to fetch student details. Please try again.',
      buttons: ['OK'],
    });
    await alert.present();
    this.isCardVisible = false; 
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
    this.cdr.detectChanges();
  }
  async onRangeChange(event: any) {
    this.isLoading = true;
    try {
      this.selectedRange = event.detail.value;
      const rangeKey = this.selectedRange as keyof typeof this.moduleRanges;
      const modulesInRange = this.moduleRanges[rangeKey].modules;
      const modulesCodes = modulesInRange.map(m => m.code);

      this.moduleDetailsData = await this.getModuleDetailsForRange(modulesCodes);
    } catch (error) {
      console.error('Error fetching module details:', error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }
  async getModuleAverages() {
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