import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { FacultyAnalyticPageRoutingModule } from './faculty-analytic-routing.module';
import { FacultyAnalyticPage } from './faculty-analytic.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    FacultyAnalyticPageRoutingModule
  ],
  declarations: [FacultyAnalyticPage]
})
export class FacultyAnalyticPageModule {}  // Corrected module name here
