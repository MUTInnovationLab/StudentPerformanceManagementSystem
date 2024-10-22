import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AddMentorPageRoutingModule } from './add-mentor-routing.module';

import { AddMentorPage } from './add-mentor.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AddMentorPageRoutingModule,
    ReactiveFormsModule
  ],
  declarations: [AddMentorPage]
})
export class AddMentorPageModule {}
