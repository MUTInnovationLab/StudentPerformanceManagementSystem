import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SupportfeedbackPageRoutingModule } from './supportfeedback-routing.module';

import { SupportfeedbackPage } from './supportfeedback.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SupportfeedbackPageRoutingModule
  ],
  declarations: [SupportfeedbackPage]
})
export class SupportfeedbackPageModule {}
