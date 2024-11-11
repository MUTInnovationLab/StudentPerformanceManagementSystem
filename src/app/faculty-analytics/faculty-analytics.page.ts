import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Chart, ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { registerables } from 'chart.js';
import { AngularFirestore } from '@angular/fire/compat/firestore';

// Define interfaces for the Firestore data structure
interface ModuleData {
  faculty: string;
  department: string;
  scannerOpenCount: number;
}

interface AssignedLecture {
  modules: ModuleData[];
}

interface DepartmentPerformance {
  name: string;
  attendanceRate: number;
  performanceLevel: 'High' | 'Medium' | 'Low';
  totalModules: number;
  totalAttendance: number;
}

@Component({
  selector: 'app-faculty-analytics',
  templateUrl: './faculty-analytics.page.html',
  styleUrls: ['./faculty-analytics.page.scss'],
})
export class FacultyAnalyticsPage implements OnInit, AfterViewInit {
  selectedFaculty: string = '';
  selectedPerformanceType: string = 'academic';  // New property for performance type
  facultyList: string[] = [];
  departmentPerformanceChart: Chart | null = null;
  performanceLevelChart: Chart | null = null;

  // Performance thresholds
  private readonly HIGH_PERFORMANCE_THRESHOLD = 75;
  private readonly MEDIUM_PERFORMANCE_THRESHOLD = 50;

  constructor(private firestore: AngularFirestore) {
    Chart.register(...registerables);
  }

  async ngOnInit() {
    await this.loadFacultyList();
    if (this.facultyList.length > 0) {
      this.selectedFaculty = this.facultyList[0];
      await this.onFacultyChange();
    }
  }

  // Ensure the charts are created after the view is initialized
  ngAfterViewInit() {
    this.updateChartsOnViewInit();
  }

  // Load the list of faculty members from Firestore
  private async loadFacultyList() {
    try {
      const snapshot = await this.firestore.collection('assignedLectures').get().toPromise();
      const modules = new Set<string>();

      snapshot?.forEach(doc => {
        const moduleData: AssignedLecture = doc.data() as AssignedLecture;
        moduleData.modules.forEach((module: ModuleData) => {
          modules.add(module.faculty);
        });
      });

      this.facultyList = Array.from(modules);
    } catch (error) {
      console.error('Error loading faculty list:', error);
    }
  }

  // Handle the change in selected faculty and update the charts
  async onFacultyChange() {
    const departmentData = await this.getDepartmentPerformance(this.selectedFaculty);
    this.updateCharts(departmentData);
  }

  // Handle the change in selected performance type (academic or attendance)
  async onPerformanceTypeChange() {
    const departmentData = await this.getDepartmentPerformance(this.selectedFaculty);
    this.updateCharts(departmentData);
  }

  // Get department performance based on the selected faculty
  private async getDepartmentPerformance(faculty: string): Promise<DepartmentPerformance[]> {
    try {
      const snapshot = await this.firestore.collection('assignedLectures').get().toPromise();

      const departmentMap = new Map<string, { totalCount: number; totalModules: number }>();

      snapshot?.forEach(doc => {
        const moduleData: AssignedLecture = doc.data() as AssignedLecture;
        moduleData.modules.forEach((module: ModuleData) => {
          if (module.faculty === faculty) {
            const dept = departmentMap.get(module.department) || { totalCount: 0, totalModules: 0 };
            dept.totalCount += module.scannerOpenCount;
            dept.totalModules += 1;
            departmentMap.set(module.department, dept);
          }
        });
      });

      return Array.from(departmentMap.entries()).map(([name, data]) => {
        const attendanceRate = (data.totalCount / (data.totalModules * 100)) * 100;
        return {
          name,
          attendanceRate,
          performanceLevel: this.getPerformanceLevel(attendanceRate),
          totalModules: data.totalModules,
          totalAttendance: data.totalCount
        };
      });
    } catch (error) {
      console.error('Error getting department performance:', error);
      return [];
    }
  }

  private getPerformanceLevel(attendanceRate: number): 'High' | 'Medium' | 'Low' {
    if (attendanceRate >= this.HIGH_PERFORMANCE_THRESHOLD) return 'High';
    if (attendanceRate >= this.MEDIUM_PERFORMANCE_THRESHOLD) return 'Medium';
    return 'Low';
  }

  // Update the charts based on department data
  private updateCharts(departmentData: DepartmentPerformance[]) {
    if (this.selectedPerformanceType === 'attendance') {
      this.createDepartmentPerformanceChart(departmentData); // Attendance-based chart
    } else {
      this.createDepartmentPerformanceChart(departmentData); // Academic performance-based chart (same chart logic)
    }
    this.createPerformanceLevelChart(departmentData);
  }

  // Create the department performance chart
  private createDepartmentPerformanceChart(departmentData: DepartmentPerformance[]) {
    const canvas = document.getElementById('departmentPerformanceChart') as HTMLCanvasElement;
    if (this.departmentPerformanceChart) {
      this.departmentPerformanceChart.destroy();
    }

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: departmentData.map(d => d.name),
        datasets: [{
          label: 'Attendance Rate (%)',
          data: departmentData.map(d => d.attendanceRate),
          backgroundColor: departmentData.map(d => {
            switch (d.performanceLevel) {
              case 'High': return '#4ade80';
              case 'Medium': return '#fbbf24';
              default: return '#f87171';
            }
          }),
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: `Department Performance in ${this.selectedFaculty}`
          },
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            title: {
              display: true,
              text: 'Attendance Rate (%)'
            }
          }
        }
      }
    };

    this.departmentPerformanceChart = new Chart(canvas, config);
  }

  private createPerformanceLevelChart(departmentData: DepartmentPerformance[]) {
    const canvas = document.getElementById('performanceLevelChart') as HTMLCanvasElement;
    if (this.performanceLevelChart) {
      this.performanceLevelChart.destroy();
    }

    const performanceCounts = {
      High: departmentData.filter(d => d.performanceLevel === 'High').length,
      Medium: departmentData.filter(d => d.performanceLevel === 'Medium').length,
      Low: departmentData.filter(d => d.performanceLevel === 'Low').length
    };

    const data: ChartData = {
      labels: ['High', 'Medium', 'Low'],
      datasets: [{
        data: [performanceCounts.High, performanceCounts.Medium, performanceCounts.Low],
        backgroundColor: ['#4ade80', '#fbbf24', '#f87171']
      }]
    };

    const config: ChartConfiguration = {
      type: 'pie',
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Performance Level Distribution'
          }
        },
        layout: {
          padding: {
            top: 20,
            bottom: 20,
            left: 20,
            right: 20
          }
        }
      }
    };

    canvas.width = 300;
    canvas.height = 300;

    this.performanceLevelChart = new Chart(canvas, config);
  }

  private updateChartsOnViewInit() {
    if (this.selectedFaculty && this.selectedPerformanceType) {
      this.onFacultyChange();
    }
  }
}
