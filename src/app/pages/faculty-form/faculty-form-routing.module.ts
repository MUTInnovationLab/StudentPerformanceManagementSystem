import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { FacultyFormPage } from './faculty-form.page';

const routes: Routes = [
  {
    path: '',
    component: FacultyFormPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FacultyFormPageRoutingModule {}
