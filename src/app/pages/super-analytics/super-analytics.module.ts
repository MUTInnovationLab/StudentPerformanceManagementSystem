import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SuperAnalyticsPageRoutingModule } from './super-analytics-routing.module';

import { SuperAnalyticsPage } from './super-analytics.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SuperAnalyticsPageRoutingModule
  ],
  declarations: [SuperAnalyticsPage]
})
export class SuperAnalyticsPageModule {}
