import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import {  CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { HODANALYTICSPageRoutingModule } from './hod-analytics-routing.module';
import { FirestoreModule } from '@angular/fire/firestore';
import { HODANALYTICSPage } from './hod-analytics.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    HODANALYTICSPageRoutingModule,
    FirestoreModule
  ],
  declarations: [HODANALYTICSPage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA] 
})
export class HODANALYTICSPageModule {}
