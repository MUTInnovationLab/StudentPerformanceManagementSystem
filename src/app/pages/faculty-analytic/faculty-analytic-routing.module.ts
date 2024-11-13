import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FacultyAnalyticPage } from './faculty-analytic.page';

const routes: Routes = [
  {
    path: '',
    component: FacultyAnalyticPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FacultyAnalyticPageRoutingModule {}
