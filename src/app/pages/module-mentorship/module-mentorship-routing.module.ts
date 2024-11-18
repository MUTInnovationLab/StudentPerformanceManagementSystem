import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ModuleMentorshipPage } from './module-mentorship.page';

const routes: Routes = [
  {
    path: '',
    component: ModuleMentorshipPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ModuleMentorshipPageRoutingModule {}
