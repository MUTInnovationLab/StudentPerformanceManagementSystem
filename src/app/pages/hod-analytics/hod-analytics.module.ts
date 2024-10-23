import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

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
  declarations: [HODANALYTICSPage]
})
export class HODANALYTICSPageModule {}
