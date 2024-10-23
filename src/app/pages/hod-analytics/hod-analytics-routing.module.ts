import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { HODANALYTICSPage } from './hod-analytics.page';

const routes: Routes = [
  {
    path: '',
    component: HODANALYTICSPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class HODANALYTICSPageRoutingModule {}
