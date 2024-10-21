import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SuperAdminPageRoutingModule } from './super-admin-routing.module';

import { SuperAdminPage } from './super-admin.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SuperAdminPageRoutingModule
  ],
  declarations: [SuperAdminPage]
})
export class SuperAdminPageModule {}
