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
    path: 'add-mentor',
    loadChildren: () => import('./pages/add-mentor/add-mentor.module').then( m => m.AddMentorPageModule)
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
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
