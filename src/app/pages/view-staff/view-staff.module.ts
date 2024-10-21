import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ViewStaffPageRoutingModule } from './view-staff-routing.module';

import { ViewStaffPage } from './view-staff.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ViewStaffPageRoutingModule
  ],
  declarations: [ViewStaffPage]
})
export class ViewStaffPageModule {}
