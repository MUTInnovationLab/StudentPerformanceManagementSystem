import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { MentorStudentsPageRoutingModule } from './mentor-students-routing.module';

import { MentorStudentsPage } from './mentor-students.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MentorStudentsPageRoutingModule
  ],
  declarations: [MentorStudentsPage]
})
export class MentorStudentsPageModule {}
