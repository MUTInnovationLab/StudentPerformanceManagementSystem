import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { LiveMeetPage } from './live-meet.page';

const routes: Routes = [
  {
    path: '',
    component: LiveMeetPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LiveMeetPageRoutingModule {}
