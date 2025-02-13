import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MentorStudentsPage } from './mentor-students.page';

const routes: Routes = [
  {
    path: '',
    component: MentorStudentsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MentorStudentsPageRoutingModule {}
