import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AddLecturerPageRoutingModule } from './add-lecturer-routing.module';

import { AddLecturerPage } from './add-lecturer.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AddLecturerPageRoutingModule
  ],
  declarations: [AddLecturerPage]
})
export class AddLecturerPageModule {}
