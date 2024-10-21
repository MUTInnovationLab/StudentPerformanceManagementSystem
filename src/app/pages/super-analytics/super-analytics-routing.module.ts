import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SuperAnalyticsPage } from './super-analytics.page';

const routes: Routes = [
  {
    path: '',
    component: SuperAnalyticsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SuperAnalyticsPageRoutingModule {}
