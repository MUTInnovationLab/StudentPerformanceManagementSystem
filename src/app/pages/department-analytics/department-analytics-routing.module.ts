import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DepartmentAnalyticsPage } from './department-analytics.page';

const routes: Routes = [
  {
    path: '',
    component: DepartmentAnalyticsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DepartmentAnalyticsPageRoutingModule {}
