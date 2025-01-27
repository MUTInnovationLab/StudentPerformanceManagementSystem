import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { DepartmentAnalyticsPageRoutingModule } from './department-analytics-routing.module';

import { DepartmentAnalyticsPage } from './department-analytics.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DepartmentAnalyticsPageRoutingModule
  ],
  declarations: [DepartmentAnalyticsPage]
})
export class DepartmentAnalyticsPageModule {}
