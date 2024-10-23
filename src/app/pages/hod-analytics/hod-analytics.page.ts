import { Component, OnInit } from '@angular/core';
import { Chart, registerables } from 'chart.js';  
import { Firestore, collection, getDocs, query, where, DocumentData } from '@angular/fire/firestore';
import { AuthenticationService } from '../../services/auths.service';

interface AttendanceRecord {
  date: string;
  moduleCode: string;
  attendance: number;
  studentNumber: string;
  scanTime: string;
}

interface ModuleAttendance {
  [moduleCode: string]: number;
}

interface ProcessedAttendance {
  date: string;
  modules: ModuleAttendance;
}

interface StaffData {
  department: string;
  faculty: string;
  fullName: string;
  email: string;
  position: string;
  staffNumber: string;
}

@Component({
  selector: 'app-hod-analytics',
  templateUrl: './hod-analytics.page.html',
  styleUrls: ['./hod-analytics.page.scss'],
})
export class HODANALYTICSPage implements OnInit {
  staffData: StaffData | null = null;
  assignedModules: string[] = [];
  attendanceData: AttendanceRecord[] = [];
  processedData: ProcessedAttendance[] = [];
  attendanceChart: Chart | null = null;

  constructor(
    private firestore: Firestore,
    private authService: AuthenticationService
  ) {
    Chart.register(...registerables);
  }

  ngOnInit() {
    this.fetchStaffData();
  }

  async fetchStaffData() {
    try {
      this.staffData = await this.authService.getLoggedInStaff();
      
      if (this.staffData) {
        await this.authenticateAndFetchModules(this.staffData.staffNumber);
      }
    } catch (error) {
      console.error('Error fetching staff data:', error);
    }
  }

  async authenticateAndFetchModules(staffNumber: string) {
    try {
      const staffCollection = collection(this.firestore, 'staff');
      const staffQuery = query(staffCollection, where('staffNumber', '==', staffNumber));
      const staffSnapshot = await getDocs(staffQuery);

      if (staffSnapshot.empty) {
        throw new Error('Staff member not found');
      }


      const facultiesCollection = collection(this.firestore, 'faculties');
      const facultyQuery = query(
        facultiesCollection, 
        where('name', '==', this.staffData?.faculty)
      );
      const facultyDocs = await getDocs(facultyQuery);

      if (facultyDocs.empty) {
        throw new Error('Faculty not found');
      }

      const facultyDoc = facultyDocs.docs[0];
      const departmentsCollection = collection(facultyDoc.ref, 'Departments');
      const departmentQuery = query(
        departmentsCollection,
        where('name', '==', this.staffData?.department)
      );
      const departmentDocs = await getDocs(departmentQuery);

      if (departmentDocs.empty) {
        throw new Error('Department not found');
      }

      const departmentData = departmentDocs.docs[0].data();
      const streams = departmentData['streams'] || {};
      
      // Get all module codes from streams
      const moduleCodes: string[] = [];
      Object.values(streams).forEach((stream: any) => {
        if (stream && stream.module) {
          moduleCodes.push(stream.module);
        }
      });

      this.assignedModules = moduleCodes;

      await this.fetchAttendanceData(moduleCodes);

    } catch (error) {
      console.error('Error in authentication flow:', error);
      throw error;
    }
  }

  async fetchAttendanceData(moduleCodes: string[]) {
    try {
      const attendedCollection = collection(this.firestore, 'Attended');
      const attendancePromises = moduleCodes.map(async (moduleCode) => {
        const moduleDoc = query(attendedCollection, where('moduleCode', '==', moduleCode));
        const attendanceDocs = await getDocs(moduleDoc);

        attendanceDocs.forEach(doc => {
          const moduleData = doc.data();
          Object.entries(moduleData).forEach(([date, records]: [string, any]) => {
            if (Array.isArray(records)) {
              records.forEach((record: any) => {
                this.attendanceData.push({
                  date,
                  moduleCode,
                  attendance: records.length,
                  studentNumber: record.studentNumber,
                  scanTime: record.scanTime
                });
              });
            }
          });
        });
      });

      await Promise.all(attendancePromises);
      this.processAttendanceData();
      this.createAttendanceChart();
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    }
  }

  processAttendanceData() {
    if (this.attendanceData.length > 0) {
      const grouped = this.attendanceData.reduce((acc: { [date: string]: ModuleAttendance }, curr: AttendanceRecord) => {
        const date = new Date(curr.date).toLocaleDateString();
        if (!acc[date]) {
          acc[date] = {};
        }
        acc[date][curr.moduleCode] = curr.attendance;
        return acc;
      }, {});

      this.processedData = Object.entries(grouped).map(([date, modules]) => ({
        date,
        modules
      }));
    }
  }

  createAttendanceChart() {
    const canvas = document.getElementById('attendanceChart') as HTMLCanvasElement;
    const ctx = canvas?.getContext('2d');

    if (ctx && this.attendanceChart) {
      this.attendanceChart.destroy(); // Destroy existing chart if it exists
    }

    if (ctx) {
      const dates = [...new Set(this.attendanceData.map(data => 
        new Date(data.date).toLocaleDateString()
      ))].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

      const moduleCodes = [...new Set(this.attendanceData.map(data => data.moduleCode))];

      const datasets = moduleCodes.map((moduleCode) => {
        return {
          label: `Module ${moduleCode}`,
          data: dates.map(date => {
            const records = this.attendanceData.filter(a => 
              new Date(a.date).toLocaleDateString() === date && 
              a.moduleCode === moduleCode
            );
            return records.length > 0 ? records[0].attendance : 0;
          }),
          backgroundColor: this.getRandomColor(),
          borderColor: this.getRandomColor(),
          borderWidth: 1
        };
      });

      this.attendanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: dates,
          datasets: datasets
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              display: true,
              position: 'top'
            },
            tooltip: {
              enabled: true,
              callbacks: {
                label: (context: any) => {
                  return `${context.dataset.label}: ${context.raw} students`;
                }
              }
            }
          },
          scales: {
            x: {
              title: {
                display: true,
                text: 'Date'
              },
              stacked: true
            },
            y: {
              title: {
                display: true,
                text: 'Number of Students'
              },
              beginAtZero: true,
              stacked: true
            }
          }
        }
      });
    }
  }

  getRandomColor(): string {
    return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
  }
}