import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ModuleMentorshipPageRoutingModule } from './module-mentorship-routing.module';
import { ModuleMentorshipPage } from './module-mentorship.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ModuleMentorshipPageRoutingModule
  ],
  declarations: [ModuleMentorshipPage]
})
export class ModuleMentorshipPageModule {}
