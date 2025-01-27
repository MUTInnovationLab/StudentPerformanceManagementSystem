import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then( m => m.HomePageModule)
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadChildren: () => import('./pages/login/login.module').then( m => m.LoginPageModule)
  },
  {
    path: 'admin',
    loadChildren: () => import('./pages/admin/admin.module').then( m => m.AdminPageModule)
  },
  {
    path: 'analytics',
    loadChildren: () => import('./pages/analytics/analytics.module').then( m => m.AnalyticsPageModule)
  },
  {
    path: 'add-lecturer',
    loadChildren: () => import('./pages/add-lecturer/add-lecturer.module').then( m => m.AddLecturerPageModule)
  },
  {
    path: 'mentors',
    children: [
      {
        path: '',
        loadChildren: () => import('./pages/add-mentor/add-mentor.module').then(m => m.AddMentorPageModule)
      },
      {
        path: 'add',
        loadChildren: () => import('./pages/add-mentor/add-mentor.module').then(m => m.AddMentorPageModule)
      },
      {
        path: 'edit/:id',
        loadChildren: () => import('./pages/add-mentor/add-mentor.module').then(m => m.AddMentorPageModule)
      }
    ]
  },
  {
    path: 'csv',
    loadChildren: () => import('./pages/csv/csv.module').then( m => m.CsvPageModule)
  },
  {
    path: 'super-admin',
    loadChildren: () => import('./pages/super-admin/super-admin.module').then( m => m.SuperAdminPageModule)
  },
  {
    path: 'super-analytics',
    loadChildren: () => import('./pages/super-analytics/super-analytics.module').then( m => m.SuperAnalyticsPageModule)
  },
  {
    path: 'view-staff',
    loadChildren: () => import('./pages/view-staff/view-staff.module').then( m => m.ViewStaffPageModule)
  },
  {
    path: 'hod-analytics',
    loadChildren: () => import('./pages/hod-analytics/hod-analytics.module').then( m => m.HODANALYTICSPageModule)
  },
  {
    path: 'supportfeedback',
    loadChildren: () => import('./pages/supportfeedback/supportfeedback.module').then( m => m.SupportfeedbackPageModule)
  },
  {
    path: 'struggling-students',
    loadChildren: () => import('./pages/struggling-students/struggling-students.module').then( m => m.StrugglingStudentsPageModule)
  },
  {
    path: 'faculty-form',
    loadChildren: () => import('./pages/faculty-form/faculty-form.module').then( m => m.FacultyFormPageModule)
  },
  {
    path: 'live-meet',
    loadChildren: () => import('./pages/live-meet/live-meet.module').then( m => m.LiveMeetPageModule)
  },
  {
    path: 'student-management',
    loadChildren: () => import('./pages/student-management/student-management.module').then( m => m.StudentManagementPageModule)
  },
 
  {
    path: 'faculty-analytic',
    loadChildren: () => import('./pages/faculty-analytic/faculty-analytic.module').then(m => m.FacultyAnalyticPageModule)
  },  {
    path: 'module-mentorship',
    loadChildren: () => import('./pages/module-mentorship/module-mentorship.module').then( m => m.ModuleMentorshipPageModule)
  },
  {
    path: 'students-performance',
    loadChildren: () => import('./pages/students-performance/students-performance.module').then( m => m.StudentsPerformancePageModule)
  },
  {
    path: 'department-analytics',
    loadChildren: () => import('./pages/department-analytics/department-analytics.module').then( m => m.DepartmentAnalyticsPageModule)
  },
  {
    path: 'students-performance',
    loadChildren: () => import('./students-performance/students-performance.module').then( m => m.StudentsPerformancePageModule)
  },

];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
