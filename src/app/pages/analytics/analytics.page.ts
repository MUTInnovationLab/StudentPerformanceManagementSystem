import { Component, OnInit, OnDestroy } from '@angular/core';
import { FirestoreService } from 'src/app/services/firestore.service';
import { AuthenticationService } from '../../services/auths.service';
import { Router } from '@angular/router';
import { Module } from '../../models/assignedModules.model';
import { switchMap, tap, takeUntil, catchError, distinctUntilChanged, filter } from 'rxjs/operators';
import { AttendanceRecord, ModuleAttendance } from '../../models/attendancePerfomance.model';
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import { Staff } from 'src/app/models/staff.model';

interface AnalyticsState {
  loading: boolean;
  error: string | null;
  attendedModules: ModuleAttendance[];
  assignedModules: Module[];
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
    assignedModules: []
  });

  state$ = this.stateSubject.asObservable();
  menuVisible = false;
  userPosition$ = new BehaviorSubject<string>('');

  constructor(
    private firestoreService: FirestoreService,
    private router: Router,
    private authService: AuthenticationService,
  ) {}

  ngOnInit(): void {
    this.initializeAuthentication();

    this.userPosition$.subscribe(position => {
      console.log('Current user position:', position);
    });
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
      return this.loadLecturerModules(staff.staffNumber);
    } else if (staff.position === 'HOD') {
      return this.loadHODModules(staff.department);
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