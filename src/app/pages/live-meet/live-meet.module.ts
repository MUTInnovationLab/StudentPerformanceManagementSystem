import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { LiveMeetPageRoutingModule } from './live-meet-routing.module';

import { LiveMeetPage } from './live-meet.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    LiveMeetPageRoutingModule
  ],
  declarations: [LiveMeetPage]
})
export class LiveMeetPageModule {}
