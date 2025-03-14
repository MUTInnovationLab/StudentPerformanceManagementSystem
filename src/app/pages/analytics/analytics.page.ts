import { Component, OnInit, OnDestroy } from '@angular/core';
import { FirestoreService } from 'src/app/services/firestore.service';
import { AuthenticationService } from '../../services/auths.service';
import { Router } from '@angular/router';
import { Module } from '../../models/assignedModules.model';
import { switchMap, tap, takeUntil, catchError, distinctUntilChanged, filter, take } from 'rxjs/operators';
import { AttendanceRecord, ModuleAttendance } from '../../models/attendancePerfomance.model';
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import { Staff } from 'src/app/models/staff.model';
import { AttendanceService } from 'src/app/services/attendance.service';
import { StudentAttendanceReport } from 'src/app/models/studentAttendance.model';

interface AnalyticsState {
  loading: boolean;
  error: string | null;
  attendedModules: ModuleAttendance[];
  assignedModules: Module[];
  studentReports: StudentAttendanceReport[];
  selectedStudent?: string;
  currentStaffRole?: string;
  currentStaffDepartment?: string;
}

@Component({
  selector: 'app-analytics',
  templateUrl: './analytics.page.html',
  styleUrls: ['./analytics.page.scss'],
})
export class AnalyticsPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private stateSubject = new BehaviorSubject<AnalyticsState>({
    loading: true,
    error: null,
    attendedModules: [],
    assignedModules: [],
    studentReports: []
  });

  state$ = this.stateSubject.asObservable();
  menuVisible = false;
  userPosition$ = new BehaviorSubject<string>('');

  constructor(
    private firestoreService: FirestoreService,
    private router: Router,
    private authService: AuthenticationService,
    private attendanceService: AttendanceService
  ) {}

  ngOnInit(): void {
    this.initializeAuthentication();

    this.userPosition$.subscribe(position => {
      console.log('Current user position:', position);
    });

    this.loadStudentAttendance();
  }

  private initializeAuthentication(): void {
    this.authService.isAuthenticated()
      .pipe(
        takeUntil(this.destroy$),
        tap(isAuthenticated => {
          if (!isAuthenticated) {
            this.router.navigate(['/login']);
          }
        }),
        filter((isAuthenticated: boolean) => isAuthenticated),
        switchMap(() => this.authService.currentStaff$),
        filter((staff: Staff | null): staff is Staff => staff !== null),
        distinctUntilChanged((prev: Staff, curr: Staff) => prev.staffNumber === curr.staffNumber),
        tap((staff: Staff) => this.userPosition$.next(staff.position)),
        switchMap((staff: Staff) => this.loadModulesByRole(staff))
      )
      .subscribe({
        error: (error: Error) => this.handleError('Authentication error', error)
      });
  }

  private loadModulesByRole(staff: Staff): Observable<ModuleAttendance[]> {
    const loadingState = { ...this.stateSubject.value, loading: true, error: null };
    this.stateSubject.next(loadingState);

    if (staff.position === 'Lecturer') {
      return this.loadLecturerModules(staff.staffNumber).pipe(
        tap(modules => {
          console.log('Loaded lecturer modules:', modules);
        })
      );
    } else if (staff.position === 'HOD') {
      return this.loadHODModules(staff.department).pipe(
        tap(modules => {
          console.log('Loaded HOD department modules:', modules);
        })
      );
    }
    
    return of([]);
  }

  private loadLecturerModules(staffNumber: string): Observable<ModuleAttendance[]> {
    return this.firestoreService.getAssignedModules(staffNumber).pipe(
      tap(modules => {
        const currentState = this.stateSubject.value;
        this.stateSubject.next({ ...currentState, assignedModules: modules });
      }),
      switchMap(modules => {
        const moduleCodes = modules.map(m => m.moduleCode);
        return moduleCodes.length ? this.firestoreService.getAttendedModules(moduleCodes) : of([]);
      }),
      tap(attendance => {
        const currentState = this.stateSubject.value;
        this.stateSubject.next({
          ...currentState,
          attendedModules: attendance,
          loading: false
        });
      }),
      catchError((error: Error) => {
        this.handleError('Failed to load lecturer modules', error);
        return of([] as ModuleAttendance[]);
      })
    );
  }

  private loadHODModules(department: string): Observable<ModuleAttendance[]> {
    return this.firestoreService.getAllAssignedLectures().pipe(
      switchMap(assignments => {
        const departmentModules = new Set<string>();
        assignments.forEach(assignment => {
          assignment.modules
            .filter(module => module.department === department)
            .forEach(module => departmentModules.add(module.moduleCode));
        });
        
        const moduleCodes = Array.from(departmentModules);
        return moduleCodes.length ? this.firestoreService.getAttendedModules(moduleCodes) : of([]);
      }),
      tap(attendance => {
        const currentState = this.stateSubject.value;
        this.stateSubject.next({
          ...currentState,
          attendedModules: attendance,
          loading: false
        });
      }),
      catchError((error: Error) => {
        this.handleError('Failed to load HOD modules', error);
        return of([] as ModuleAttendance[]);
      })
    );
  }

  private async loadStudentAttendance() {
    try {
      const currentStaff = await this.authService.currentStaff$.pipe(
        filter((staff: Staff | null): staff is Staff => staff !== null),
        take(1)
      ).toPromise();

      if (!currentStaff) {
        throw new Error('No authenticated staff found');
      }

      // Store staff role and department in state for UI access control
      const currentState = this.stateSubject.value;
      this.stateSubject.next({
        ...currentState,
        currentStaffRole: currentStaff.position,
        currentStaffDepartment: currentStaff.department
      });

      let studentNumbers: string[] = [];
      let relevantModules: Module[] = [];

      if (currentStaff.position === 'Lecturer') {
        // Get only students enrolled in lecturer's modules
        const assignedModules = await this.firestoreService.getAssignedModules(currentStaff.staffNumber)
          .pipe(take(1))
          .toPromise() || [];
        
        relevantModules = assignedModules;
        
        // Get enrolled students for these modules
        const enrolledStudents = await this.firestoreService.getEnrolledStudentsForModules(
          assignedModules.map(module => module.moduleCode)
        );
        studentNumbers = [...new Set(enrolledStudents)]; // Remove duplicates
      } else if (currentStaff.position === 'HOD') {
        // Get all modules in this department
        const departmentModules = await this.firestoreService.getDepartmentModules(currentStaff.department)
          .pipe(take(1))
          .toPromise() || [];
        
        relevantModules = departmentModules;
        
        // Get all students in the department
        const allStudents = await this.firestoreService.getAllStudents();
        studentNumbers = allStudents
          .filter(student => student['department'] === currentStaff.department)
          .map(student => student['studentNumber']);
      }

      const reports = await Promise.all(
        studentNumbers.map(async studentNumber => {
          const report = await this.attendanceService.getStudentAttendanceReport(studentNumber);
          
          // Filter modules based on staff role
          if (currentStaff.position === 'Lecturer') {
            // Lecturer should only see their assigned modules
            const moduleCodeSet = new Set(relevantModules.map(m => m.moduleCode));
            report.modules = report.modules.filter(module => moduleCodeSet.has(module.moduleCode));
            
            // Recalculate overall attendance after filtering
            if (report.modules.length > 0) {
              report.overallAttendance = report.modules.reduce((sum, module) => 
                sum + module.attendancePercentage, 0) / report.modules.length;
            } else {
              report.overallAttendance = 0;
            }
          }
          
          return report;
        })
      );

      // Filter out students with no modules
      const filteredReports = reports.filter(report => report.modules.length > 0);

      this.stateSubject.next({
        ...this.stateSubject.value,
        studentReports: filteredReports,
        loading: false
      });
      
      console.log('Loaded student reports:', filteredReports);
    } catch (error) {
      this.handleError('Failed to load student attendance', error as Error);
    }
  }

  selectStudent(studentNumber: string) {
    const currentState = this.stateSubject.value;
    this.stateSubject.next({
      ...currentState,
      selectedStudent: studentNumber
    });
  }

  getAttendanceColor(percentage: number): string {
    if (percentage >= 75) return 'success';
    if (percentage >= 50) return 'warning';
    return 'danger';
  }

  private handleError(message: string, error: Error): void {
    console.error(message, error);
    const currentState = this.stateSubject.value;
    this.stateSubject.next({
      ...currentState,
      error: `${message}. Please try again.`,
      loading: false
    });
  }

  getDailyAttendance(dates: { [key: string]: AttendanceRecord[] }): AttendanceRecord[] {
    return Object.values(dates).reduce((acc, val) => acc.concat(val), [] as AttendanceRecord[]);
  }

  toggleMenu(): void {
    this.menuVisible = !this.menuVisible;
    console.log('Menu visibility:', this.menuVisible); // Add this for debugging
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
    this.menuVisible = false;
  }
  Csv(){
    this.router.navigate(['/csv']);
    this.menuVisible = false;
  }

  async logout(): Promise<void> {
    try {
      await this.authService.signOut();
      this.router.navigate(['/login']);
      this.menuVisible = false;
    } catch (error) {
      this.handleError('Logout failed', error as Error);
    }
  }

  objectKeys(obj: Record<string, unknown>): string[] {
    return Object.keys(obj);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}