import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { StrugglingStudentsPage } from './struggling-students.page';

const routes: Routes = [
  {
    path: '',
    component: StrugglingStudentsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class StrugglingStudentsPageRoutingModule {}
