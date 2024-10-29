import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { StrugglingStudentsPageRoutingModule } from './struggling-students-routing.module';

import { StrugglingStudentsPage } from './struggling-students.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    StrugglingStudentsPageRoutingModule
  ],
  declarations: [StrugglingStudentsPage]
})
export class StrugglingStudentsPageModule {}
