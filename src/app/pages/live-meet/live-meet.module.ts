import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { LiveMeetPageRoutingModule } from './live-meet-routing.module';

import { LiveMeetPage } from './live-meet.page';
import { InvitationModalComponent } from 'src/app/invitation-modal/invitation-modal.component';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    IonicModule,
    LiveMeetPageRoutingModule
  ],
  declarations: [LiveMeetPage,InvitationModalComponent]
})
export class LiveMeetPageModule {}
