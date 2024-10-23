import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SupportfeedbackPage } from './supportfeedback.page';

const routes: Routes = [
  {
    path: '',
    component: SupportfeedbackPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SupportfeedbackPageRoutingModule {}
