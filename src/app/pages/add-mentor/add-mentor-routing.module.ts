import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AddMentorPage } from './add-mentor.page';

const routes: Routes = [
  {
    path: '',
    component: AddMentorPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AddMentorPageRoutingModule {}
