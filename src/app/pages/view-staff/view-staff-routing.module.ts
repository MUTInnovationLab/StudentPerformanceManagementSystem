import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ViewStaffPage } from './view-staff.page';

const routes: Routes = [
  {
    path: '',
    component: ViewStaffPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ViewStaffPageRoutingModule {}
