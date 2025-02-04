import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AuthenticationService } from '../../services/auths.service';
import { AcademicService } from '../../services/academic.service';
import { Faculty, Department, Module } from '../../models/faculty.model';
import { ModuleMarksDocument } from '../../models/studentsMarks.model';
import { ReportService } from '../../services/reports.service';
import { ActionSheetController } from '@ionic/angular';

interface PerformanceCategory {
  range: string;
  count: number;
  students: DetailedStudentInfo[];
}

interface Marks {
  [key: `test${number}`]: number | null;
  studentNumber: string;
  average: number;
  test1: number;
  test2: number;
  test3: number;
  test4: number;
  test5: number;
  test6: number;
  test7: number;
  moduleCode: string;
  scanTime: string | null;
}

interface DetailedStudentInfo {
  studentNumber: string;
  name: string;
  surname: string;
  email: string;
  department: string;
  average: number;
  moduleName: string;
  moduleCode: string;
  marks: Marks;
}

interface DepartmentAnalytics {
  name: string;
  performanceCategories: {
    atRisk: PerformanceCategory;
    partialPass: PerformanceCategory;
    intermediatePass: PerformanceCategory;
    distinction: PerformanceCategory;
  };
  totalStudents: number;
}

@Component({
  selector: 'app-department-analytics',
  templateUrl: './department-analytics.page.html',
  styleUrls: ['./department-analytics.page.scss'],
})
export class DepartmentAnalyticsPage implements OnInit {
  performanceChart: Chart | null = null;
  studentDistributionChart: Chart | null = null;
  
  faculty: string = '';
  departments: DepartmentAnalytics[] = [];
  isLoading: boolean = true;
  selectedDepartment: string = '';
  error: string | null = null;

  private readonly PERFORMANCE_THRESHOLDS = {
    DISTINCTION: 75,
    INTERMEDIATE: 60,
    PARTIAL: 50,
    AT_RISK: 0
  };

  private readonly CHART_COLORS = {
    AT_RISK: '#ef4444',
    PARTIAL: '#f59e0b',
    INTERMEDIATE: '#3b82f6',
    DISTINCTION: '#22c55e'
  };

  constructor(
    private firestore: AngularFirestore,
    private authService: AuthenticationService,
    private academicService: AcademicService,
    private reportService: ReportService,
    private actionSheetCtrl: ActionSheetController
  ) {
    Chart.register(...registerables);
  }

  async ngOnInit() {
    try {
      const isHOD = await this.authService.isHOD();
      if (!isHOD) {
        this.error = 'Access denied. Only HODs can view department analytics.';
        return;
      }

      this.faculty = await this.authService.getLoggedInFaculty();
      const department = await this.authService.getLoggedInDepartment();
      
      console.log('Loading analytics for:', {
        faculty: this.faculty,
        department: department
      });
      
      await this.loadDepartmentAnalytics(department);
    } catch (error) {
      console.error('Error initializing department analytics:', error);
      this.error = 'Failed to load department data';
    }
  }

  async ngAfterViewInit() {
    if (this.departments.length > 0) {
      setTimeout(() => {
        this.updateCharts();
      }, 100);
    }
  }

  async retryLoad() {
    this.error = null;
    this.isLoading = true;
    try {
      const department = await this.authService.getLoggedInDepartment();
      await this.loadDepartmentAnalytics(department);
    } catch (error) {
      this.error = 'Failed to load analytics data. Please try again.';
      console.error('Error retrying load:', error);
    }
  }

  private async loadDepartmentAnalytics(hodDepartment: string) {
    this.isLoading = true;
    try {
      console.log('Faculty before sanitization:', this.faculty);
      
      if (!this.faculty) {
        throw new Error('Faculty name is undefined or empty');
      }

      const facultyRef = this.firestore.collection('faculties').doc(this.faculty);
      const facultyDoc = await facultyRef.get().toPromise();

      if (!facultyDoc?.exists) {
        this.error = 'Faculty not found';
        return;
      }

      const faculty = facultyDoc.data() as Faculty;
      const hodDept = faculty.departments.find(dept => dept.name === hodDepartment);
      
      if (hodDept) {
        await this.processDepartments([hodDept]);
      } else {
        this.error = 'Department data not found';
      }
    } catch (error) {
      console.error('Error loading department analytics:', error);
      this.error = 'Failed to load analytics data';
    } finally {
      this.isLoading = false;
    }
  }

  private async processDepartments(departments: Department[]) {
    this.departments = await Promise.all(
      departments.map(async (dept) => {
        const modules = this.getAllModulesFromDepartment(dept);
        const analytics = await this.calculateDepartmentPerformance(dept.name, modules);
        return analytics;
      })
    );
    this.updateCharts();
  }

  private getAllModulesFromDepartment(department: Department): Module[] {
    const modules: Module[] = [...(department.modules || [])];
    
    if (department.streams) {
      Object.values(department.streams).forEach(streams => {
        streams.forEach(stream => {
          if (stream.modules) {
            modules.push(...stream.modules);
          }
        });
      });
    }

    return modules;
  }

  private async calculateDepartmentPerformance(
    departmentName: string,
    modules: Module[]
  ): Promise<DepartmentAnalytics> {
    const performanceCategories = {
      atRisk: { range: '0-49', count: 0, students: [] as DetailedStudentInfo[] },
      partialPass: { range: '50-59', count: 0, students: [] as DetailedStudentInfo[] },
      intermediatePass: { range: '60-74', count: 0, students: [] as DetailedStudentInfo[] },
      distinction: { range: '75-100', count: 0, students: [] as DetailedStudentInfo[] }
    };

    let totalStudents = 0;
    
    try {
      const moduleChunks = this.chunkArray(modules, 10);
      
      for (const moduleChunk of moduleChunks) {
        const moduleCodes = moduleChunk.map(m => m.moduleCode);
        console.log('Processing modules:', moduleCodes);

        const marksQuery = await this.firestore
          .collection('marks')
          .ref.where('moduleCode', 'in', moduleCodes)
          .get();

        const studentNumbers = new Set<string>();
        const moduleMarks = new Map<string, any>();

        marksQuery.docs.forEach(doc => {
          const data = doc.data() as ModuleMarksDocument;
          moduleMarks.set(doc.id, data);
          
          if (data.marks) {
            data.marks.forEach(mark => {
              if (mark.studentNumber) {
                studentNumbers.add(mark.studentNumber.toString());
              }
            });
          }
        });

        const studentChunks = this.chunkArray(Array.from(studentNumbers), 10);
        const studentMap = new Map<string, any>();

        for (const studentChunk of studentChunks) {
          const studentsQuery = await this.firestore
            .collection('students')
            .ref.where('studentNumber', 'in', studentChunk)
            .get();

          studentsQuery.docs.forEach(doc => {
            studentMap.set(doc.id, doc.data());
          });
        }

        moduleMarks.forEach((moduleData, moduleCode) => {
          const module = modules.find(m => m.moduleCode === moduleCode);
          if (!module) return;

          moduleData.marks.forEach((mark: any) => {
            if (!mark.studentNumber) return;

            totalStudents++;
            const average = mark.average ? Number(mark.average) : 
                           this.calculateStudentAverage(mark, moduleData.testPercentages);

            const studentData = studentMap.get(mark.studentNumber.toString());

            if (studentData) {
              const studentDetail: DetailedStudentInfo = {
                studentNumber: mark.studentNumber,
                name: studentData.name ?? 'N/A',
                surname: studentData.surname ?? 'N/A',
                email: studentData.email ?? 'N/A',
                department: studentData.department ?? 'N/A',
                average,
                moduleName: module.moduleName,
                moduleCode: moduleCode,
                marks: {
                  studentNumber: mark.studentNumber,
                  average: mark.average,
                  test1: mark.test1 ?? undefined,
                  test2: mark.test2 ?? undefined,
                  test3: mark.test3 ?? undefined,
                  test4: mark.test4 ?? undefined,
                  test5: mark.test5 ?? undefined,
                  test6: mark.test6 ?? undefined,
                  test7: mark.test7 ?? undefined,
                  moduleCode: moduleCode,
                  scanTime: mark.scanTime ?? null
                }
              };

              if (average >= this.PERFORMANCE_THRESHOLDS.DISTINCTION) {
                performanceCategories.distinction.count++;
                performanceCategories.distinction.students.push(studentDetail);
              } else if (average >= this.PERFORMANCE_THRESHOLDS.INTERMEDIATE) {
                performanceCategories.intermediatePass.count++;
                performanceCategories.intermediatePass.students.push(studentDetail);
              } else if (average >= this.PERFORMANCE_THRESHOLDS.PARTIAL) {
                performanceCategories.partialPass.count++;
                performanceCategories.partialPass.students.push(studentDetail);
              } else {
                performanceCategories.atRisk.count++;
                performanceCategories.atRisk.students.push(studentDetail);
              }
            }
          });
        });
      }
    } catch (error) {
      console.error('Error in batch processing:', error);
      throw error;
    }

    return {
      name: departmentName,
      performanceCategories,
      totalStudents
    };
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private updateCharts() {
    setTimeout(() => {
      this.createPerformanceDistributionChart();
      this.createDepartmentComparisonChart();
    }, 150);
  }

  private createPerformanceDistributionChart() {
    try {
      const canvas = document.getElementById('performanceChart') as HTMLCanvasElement;
      if (!canvas) {
        throw new Error('Performance chart canvas not found');
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get 2D context for performance chart');
      }

      if (this.performanceChart) {
        this.performanceChart.destroy();
      }

      const performanceData = this.departments.reduce((acc: number[], dept: DepartmentAnalytics) => {
        return [
          acc[0] + dept.performanceCategories.atRisk.count || 0,
          acc[1] + dept.performanceCategories.partialPass.count || 0,
          acc[2] + dept.performanceCategories.intermediatePass.count || 0,
          acc[3] + dept.performanceCategories.distinction.count || 0
        ];
      }, [0, 0, 0, 0]);

      const config: ChartConfiguration = {
        type: 'bar',
        data: {
          labels: ['At Risk', 'Partial Pass', 'Intermediate Pass', 'Distinction'],
          datasets: [{
            label: 'Student Performance Distribution',
            data: performanceData,
            backgroundColor: [
              this.CHART_COLORS.AT_RISK,
              this.CHART_COLORS.PARTIAL,
              this.CHART_COLORS.INTERMEDIATE,
              this.CHART_COLORS.DISTINCTION
            ]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Number of Students'
              }
            }
          },
          plugins: {
            legend: {
              display: true,
              position: 'bottom'
            }
          }
        }
      };

      this.performanceChart = new Chart(ctx, config);
    } catch (error) {
      console.error('Error creating performance chart:', error);
      this.error = 'Failed to create performance chart';
    }
  }

  private createDepartmentComparisonChart() {
    try {
      const canvas = document.getElementById('distributionChart') as HTMLCanvasElement;
      if (!canvas) {
        throw new Error('Distribution chart canvas not found');
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get 2D context for distribution chart');
      }

      if (this.studentDistributionChart) {
        this.studentDistributionChart.destroy();
      }

      const config: ChartConfiguration = {
        type: 'bar',
        data: {
          labels: this.departments.map(dept => dept.name),
          datasets: [{
            label: 'Total Students',
            data: this.departments.map(dept => dept.totalStudents),
            backgroundColor: this.CHART_COLORS.DISTINCTION
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Number of Students'
              }
            }
          },
          plugins: {
            legend: {
              display: true,
              position: 'bottom'
            }
          }
        }
      };

      this.studentDistributionChart = new Chart(ctx, config);
    } catch (error) {
      console.error('Error creating department comparison chart:', error);
    }
  }

  getTestMark(marks: Marks, testNumber: number): number | undefined {
    return marks[`test${testNumber}`] ?? undefined;
  }

  private calculateStudentAverage(mark: any, testPercentages: any): number {
    let totalWeightedScore = 0;
    let totalWeight = 0;
  
    for (let i = 1; i <= 7; i++) {
      const testKey = `test${i}`;
      const score = Number(mark[testKey]);
      const weight = testPercentages[testKey];
      
      if (!isNaN(score) && score !== null && weight) {
        totalWeightedScore += (score * weight);
        totalWeight += weight;
      }
    }
  
    return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
  }

  async presentReportFormatOptions() {
    if (!this.departments || this.departments.length === 0) return;

    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Select Report Format',
      buttons: [
        {
          text: 'PDF Document',
          icon: 'document',
          handler: () => {
            this.generateReport('pdf');
          }
        },
        {
          text: 'Excel Spreadsheet',
          icon: 'grid',
          handler: () => {
            this.generateReport('excel');
          }
        },
        {
          text: 'Cancel',
          icon: 'close',
          role: 'cancel'
        }
      ]
    });

    await actionSheet.present();
  }

  async generateReport(format: 'pdf' | 'excel') {
    if (!this.departments || this.departments.length === 0) return;
    
    const department = this.departments[0];
    const allStudents = [
      ...department.performanceCategories.atRisk.students,
      ...department.performanceCategories.partialPass.students,
      ...department.performanceCategories.intermediatePass.students,
      ...department.performanceCategories.distinction.students
    ];

    if (format === 'pdf') {
      const doc = this.reportService.generateDepartmentReport(
        department.name,
        allStudents,
        department.performanceCategories
      );
      doc.save(`${department.name}_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } else {
      this.reportService.generateDepartmentExcel(
        department.name,
        allStudents,
        department.performanceCategories
      );
    }
  }
}
