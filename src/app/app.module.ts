import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';

// Firebase imports
import { AngularFireModule } from '@angular/fire/compat';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { environment } from '../environments/environment';
import { FirestoreModule } from '@angular/fire/firestore'; 
import { FirestoreService } from 'src/app/services/firestore.service';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule, 
    IonicModule.forRoot(), 
    AppRoutingModule,
    AngularFireModule.initializeApp(environment.firebaseConfig),
    AngularFireAuthModule
    
    
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]  ,
  providers: 
  [ FirestoreService, 
    { 
      provide: 
      RouteReuseStrategy, 
      
      useClass: 
      IonicRouteStrategy 
    }
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}