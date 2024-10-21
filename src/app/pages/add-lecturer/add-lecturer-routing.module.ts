import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AddLecturerPage } from './add-lecturer.page';

const routes: Routes = [
  {
    path: '',
    component: AddLecturerPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AddLecturerPageRoutingModule {}
