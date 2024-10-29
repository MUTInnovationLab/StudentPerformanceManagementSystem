// import { NgModule,CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { FormsModule} from '@angular/forms';

// import { IonicModule } from '@ionic/angular';

// import { FacultyFormPageRoutingModule } from './faculty-form-routing.module';
// // import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
// import { FacultyFormPage } from './faculty-form.page';

// @NgModule({
//   imports: [
//     CommonModule,
//     FormsModule,
   
//     IonicModule,
//     FacultyFormPageRoutingModule
//   ],
//   declarations: [],
//   schemas: [CUSTOM_ELEMENTS_SCHEMA],
// })
// export class FacultyFormPageModule {}
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { FacultyFormPageRoutingModule } from './faculty-form-routing.module';
import { FacultyFormPage } from './faculty-form.page'; // Import the component

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    FacultyFormPageRoutingModule
  ],
  declarations: [FacultyFormPage], // Declare the component here
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class FacultyFormPageModule {}
