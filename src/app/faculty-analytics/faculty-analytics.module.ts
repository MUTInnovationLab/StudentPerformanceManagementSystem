import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { FacultyAnalyticsPageRoutingModule } from './faculty-analytics-routing.module';
import { FacultyAnalyticsPage } from './faculty-analytics.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    FacultyAnalyticsPageRoutingModule
  ],
  declarations: [FacultyAnalyticsPage]
})
export class FacultyAnalyticsPageModule {}
