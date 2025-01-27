import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { StudentsPerformancePageRoutingModule } from './students-performance-routing.module';

import { StudentsPerformancePage } from './students-performance.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    StudentsPerformancePageRoutingModule
  ],
  declarations: [StudentsPerformancePage]
})
export class StudentsPerformancePageModule {}
