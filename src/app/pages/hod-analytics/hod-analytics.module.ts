import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { HODANALYTICSPageRoutingModule } from './hod-analytics-routing.module';

import { HODANALYTICSPage } from './hod-analytics.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    HODANALYTICSPageRoutingModule
  ],
  declarations: [HODANALYTICSPage]
})
export class HODANALYTICSPageModule {}
