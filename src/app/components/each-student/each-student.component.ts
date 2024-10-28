import { Component, OnInit, Input } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ModalController } from '@ionic/angular';
import { Marks } from 'src/app/models/marks.model'; 
import { Student } from 'src/app/models/student.model';

@Component({
  selector: 'app-each-student',
  templateUrl: './each-student.component.html',
  styleUrls: ['./each-student.component.scss'],
})
export class EachStudentComponent implements OnInit {
  @Input() studentDetails: Student | undefined;
  @Input() marks: Marks[] = [];  // Ensure marks are received as input

  constructor(
    private modalController: ModalController,
    private firestore: AngularFirestore
  ) {}

  ngOnInit() {
    // Check if studentDetails and studentNumber are defined
    if (this.studentDetails?.studentNumber !== undefined) {
      const studentNumberAsNumber = Number(this.studentDetails.studentNumber); // Convert to number
      this.loadMarks(studentNumberAsNumber); // Pass the converted number
    }
  }

  // Fetch marks based on studentNumber (which is treated as a number)
  loadMarks(studentNumber: number) { // Change type to number
    this.firestore.collection<Marks>('marks', ref => 
      ref.where('studentNumber', '==', studentNumber)
    ).valueChanges()
    .subscribe(data => {
      console.log('Marks data for student:', data);  // Log fetched marks
      if (data.length === 0) {
        console.warn('No marks found for student number:', studentNumber);
      }
      this.marks = data; // Now data is of type Marks[]
    }, error => {
      console.error('Error fetching marks:', error);
    });
  }

  // Dismiss the modal
  dismiss() {
    this.modalController.dismiss();
  }
}
