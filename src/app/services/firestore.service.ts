import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {

  constructor(
    private firestore: AngularFirestore
  ) { }

  // Fetch the data and map it to the expected structure
  getAttendedModules(): Observable<any[]> {
    return this.firestore.collection('Attended').snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data();
        const moduleName = a.payload.doc.id; // e.g., CA100, CF100
        return { moduleName, dates: data };  // each module with its attendance dates
      }))
    );
  }

}
