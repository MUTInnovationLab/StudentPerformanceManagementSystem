import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Chart, ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { registerables } from 'chart.js';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AuthenticationService } from '../../services/auths.service';
import { Marks } from 'src/app/models/marks.model';

interface ModuleData {
  faculty: string;
  department: string;
  scannerOpenCount: number;
  marks?: Marks[];
}

interface AssignedLecture {
  modules: ModuleData[];
}

interface DepartmentPerformance {
  name: string;
  academicPerformanceRate: number;
  attendancePerformanceRate: number;
  performanceLevel: 'High' | 'Medium' | 'Low';
  totalModules: number;
}

@Component({
  selector: 'app-faculty-analytic',
  templateUrl: './faculty-analytic.page.html',
  styleUrls: ['./faculty-analytic.page.scss'],
})
export class FacultyAnalyticPage implements OnInit, AfterViewInit {
  selectedPerformanceType: 'academic' | 'attendance' = 'academic';
  faculty: string = '';
  departmentPerformanceChart: Chart | null = null;
  performanceLevelChart: Chart | null = null;

  private readonly HIGH_PERFORMANCE_THRESHOLD = 75;
  private readonly MEDIUM_PERFORMANCE_THRESHOLD = 50;

  constructor(
    private firestore: AngularFirestore,
    private authService: AuthenticationService
  ) {
    Chart.register(...registerables);
  }

  async ngOnInit() {
    const user = await this.authService.getLoggedInStaff();
    if (user) {
      this.faculty = user.faculty;
      await this.onFacultyChange();
    }
  }

  ngAfterViewInit() {
    this.updateChartsOnViewInit();
  }

  async onPerformanceTypeChange() {
    await this.onFacultyChange();
  }

  private async onFacultyChange() {
    const departmentData = await this.getDepartmentPerformance(this.faculty);
    this.updateCharts(departmentData);
  }

  private async getDepartmentPerformance(faculty: string): Promise<DepartmentPerformance[]> {
    try {
      const snapshot = await this.firestore.collection('assignedLectures').get().toPromise();

      const departmentMap = new Map<string, { academicMetric: number; attendanceMetric: number; totalModules: number }>();

      snapshot?.forEach(doc => {
        const moduleData: AssignedLecture = doc.data() as AssignedLecture;
        moduleData.modules.forEach((module: ModuleData) => {
          if (module.faculty === faculty) {
            const dept = departmentMap.get(module.department) || { academicMetric: 0, attendanceMetric: 0, totalModules: 0 };

            if (module.marks) {
              module.marks.forEach((markData: Marks) => {
                const avgMarks = this.calculateAverageMarks(markData);
                dept.academicMetric += avgMarks;
              });
            }
            
            dept.attendanceMetric += module.scannerOpenCount;
            dept.totalModules += 1;
            departmentMap.set(module.department, dept);
          }
        });
      });

      return Array.from(departmentMap.entries()).map(([name, data]) => {
        const academicPerformanceRate = (data.academicMetric / data.totalModules);
        const attendancePerformanceRate = (data.attendanceMetric / data.totalModules);
        const performanceLevel = this.getPerformanceLevel(
          this.selectedPerformanceType === 'academic' ? academicPerformanceRate : attendancePerformanceRate
        );

        return {
          name,
          academicPerformanceRate,
          attendancePerformanceRate,
          performanceLevel,
          totalModules: data.totalModules
        };
      });
    } catch (error) {
      console.error('Error getting department performance:', error);
      return [];
    }
  }

  private calculateAverageMarks(marks: Marks): number {
    const markValues = [
      marks.test1, marks.test2, marks.test3, marks.test4,
      marks.test5, marks.test6, marks.test7
    ];

    const validMarks = markValues.filter((mark): mark is number => typeof mark === 'number');
    const totalMarks = validMarks.reduce((sum, mark) => sum + mark, 0);

    return validMarks.length ? totalMarks / validMarks.length : 0;
  }

  private getPerformanceLevel(performanceRate: number): 'High' | 'Medium' | 'Low' {
    if (performanceRate >= this.HIGH_PERFORMANCE_THRESHOLD) return 'High';
    if (performanceRate >= this.MEDIUM_PERFORMANCE_THRESHOLD) return 'Medium';
    return 'Low';
  }

  private updateCharts(departmentData: DepartmentPerformance[]) {
    const academicData = departmentData.map(d => d.academicPerformanceRate);
    const attendanceData = departmentData.map(d => d.attendancePerformanceRate);

    this.createDepartmentPerformanceChart(
      departmentData,
      this.selectedPerformanceType === 'academic' ? academicData : attendanceData,
      this.selectedPerformanceType === 'academic' ? 'Average Marks (%)' : 'Attendance Rate (%)'
    );
    this.createPerformanceLevelChart(departmentData);
  }

  private createDepartmentPerformanceChart(
    departmentData: DepartmentPerformance[],
    performanceData: number[],
    metricLabel: string
  ) {
    const canvas = document.getElementById('departmentPerformanceChart') as HTMLCanvasElement;
    if (this.departmentPerformanceChart) {
      this.departmentPerformanceChart.destroy();
    }

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: departmentData.map(d => d.name),
        datasets: [{
          label: metricLabel,
          data: performanceData,
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
            text: `Department ${this.selectedPerformanceType === 'academic' ? 'Academic' : 'Attendance'} Performance`
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
              text: metricLabel
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
            text: `${this.selectedPerformanceType === 'academic' ? 'Academic' : 'Attendance'} Performance Level Distribution`
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
    if (this.faculty && this.selectedPerformanceType) {
      this.onFacultyChange();
    }
  }
}