import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth'; 
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage'; 
import { Observable, throwError, from } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { lastValueFrom } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { User } from 'src/app/models/users.model';
//import { AuthService } from './auth.service';
import { collection } from 'firebase/firestore';
//import { AppNotification, NotificationLog } from '../Model/notification';
import * as firebase from 'firebase/app';
import 'firebase/firestore';


@Injectable({
  providedIn: 'root'
})
export class DataService {

  constructor(
    private afs: AngularFirestore,
    private auth: AngularFireAuth,
    private storage: AngularFireStorage,
    private firestore: AngularFirestore,
    private db: AngularFirestore
  ) { }


  getAllStaff(): Observable<any[]> {
    return this.afs.collection<User>('/staff').snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as User;
        const id = a.payload.doc.id;
        return { ...data, id }; // Correctly include 'id' without duplication
      }))
    );
  }

}
