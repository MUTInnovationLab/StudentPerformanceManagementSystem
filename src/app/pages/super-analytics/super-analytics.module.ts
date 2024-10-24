import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms'; // Added ReactiveFormsModule if needed
import { IonicModule } from '@ionic/angular';

import { SuperAnalyticsPageRoutingModule } from './super-analytics-routing.module';
import { SuperAnalyticsPage } from './super-analytics.page';

// Corrected import path for the EachStudentComponent
import { EachStudentComponent } from 'src/app/components/each-student/each-student.component'; // Ensure hyphen instead of dots

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule, // Include ReactiveFormsModule if needed in your forms
    IonicModule,
    SuperAnalyticsPageRoutingModule
  ],
  declarations: [SuperAnalyticsPage, EachStudentComponent]
})
export class SuperAnalyticsPageModule {}
