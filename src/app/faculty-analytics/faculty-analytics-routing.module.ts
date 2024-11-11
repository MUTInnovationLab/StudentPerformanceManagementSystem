import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FacultyAnalyticsPage } from './faculty-analytics.page';

const routes: Routes = [
  {
    path: '',
    component: FacultyAnalyticsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FacultyAnalyticsPageRoutingModule {}
