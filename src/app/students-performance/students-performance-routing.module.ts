import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { StudentsPerformancePage } from './students-performance.page';

const routes: Routes = [
  {
    path: '',
    component: StudentsPerformancePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class StudentsPerformancePageRoutingModule {}
