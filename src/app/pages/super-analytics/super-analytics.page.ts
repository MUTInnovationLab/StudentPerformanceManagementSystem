import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, combineLatest } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { ModalController } from '@ionic/angular';  // Add ModalController
import { EachStudentComponent } from '../../components/each-student/each-student.component';  // Import modal component
import { Marks } from 'src/app/models/marks.model'; 

interface AttendanceRecord {
  id?: string;
  studentNumber: string;
}

interface Student {
  studentNumber: string;
  name: string;
  surname: string;
  email: string;
  course: string;
  year: string;
  department: string;
}

interface AttendanceWithStudentAndMarks extends AttendanceRecord {
  studentDetails?: Student;
  marks?: Marks[];
}

@Component({
  selector: 'app-super-analytics',
  templateUrl: './super-analytics.page.html',
  styleUrls: ['./super-analytics.page.scss']
})
export class SuperAnalyticsPage implements OnInit {
  attendanceRecords$: Observable<{ date: string; records: AttendanceWithStudentAndMarks[]; }[]> | undefined;

  constructor(
    private firestore: AngularFirestore,
    private modalController: ModalController
  ) {}

  ngOnInit() {
    this.loadAttendanceData();
  }

  async showStudentDetails(record: AttendanceWithStudentAndMarks) {
    console.log('Showing details for student:', record.studentDetails);
    console.log('Fetched Marks:', record.marks);
    

    const modal = await this.modalController.create({
      component: EachStudentComponent,
      componentProps: {
        studentDetails: record.studentDetails,
        marks: record.marks // Ensure marks are passed here
      }
    });
    return await modal.present();
}

  private loadAttendanceData() {
    const students$ = this.firestore
      .collection<Student>('students')
      .snapshotChanges()
      .pipe(
        map(actions => {
          const students: { [key: string]: Student } = {};
          actions.forEach(action => {
            const data = action.payload.doc.data() as Student;
            const id = action.payload.doc.id;
            students[id] = { ...data, studentNumber: id };
          });
          return students;
        }),
        take(1) // Fetch only once
      );

      const marks$ = this.firestore
      .collection<Marks>('marks')
      .snapshotChanges()
      .pipe(
        map(actions => {
          const marks: { [studentNumber: string]: Marks[] } = {};
          actions.forEach(action => {
            const mark = action.payload.doc.data() as Marks;
            const studentNumber = mark.studentNumber;
    
            if (!marks[studentNumber]) {
              marks[studentNumber] = [];
            }
            marks[studentNumber].push(mark);
          });
          return marks;
        }),
        take(1) // Fetch only once
      );
    

    const attendance$ = this.firestore
      .collection('Attended')
      .snapshotChanges()
      .pipe(
        map(actions => {
          const records: { [date: string]: AttendanceRecord[] } = {};

          actions.forEach(action => {
            const data = action.payload.doc.data() as { [key: string]: any };
            const date = action.payload.doc.id;

            if (!records[date]) {
              records[date] = [];
            }

            if (Array.isArray(data)) {
              data.forEach(item => {
                this.processAttendanceItem(item, date, records[date]);
              });
            } else if (typeof data === 'object' && data !== null) {
              if (Object.keys(data).length === 1 && Array.isArray(Object.values(data)[0])) {
                Object.values(data)[0].forEach((item: any) => {
                  this.processAttendanceItem(item, date, records[date]);
                });
              } else {
                Object.values(data).forEach(item => {
                  this.processAttendanceItem(item, date, records[date]);
                });
              }
            }
          });

          return records;
        }),
        take(1) // Fetch only once
      );

    this.attendanceRecords$ = combineLatest([attendance$, students$, marks$]).pipe(
      map(([attendanceRecords, students, marks]) => {
        return Object.entries(attendanceRecords)
          .map(([date, records]) => ({
            date,
            records: records.map(record => ({
              ...record,
              studentDetails: students[record.studentNumber] || { name: 'Unknown', surname: 'Unknown' },
              marks: marks[record.studentNumber] || []
            }))
          }))
          .sort((a, b) => a.date.localeCompare(b.date));
      })
    );

    // Add error handling
    this.attendanceRecords$.subscribe({
      next: () => console.log('Attendance data loaded successfully'),
      error: (err) => console.error('Error loading attendance data:', err)
    });
  }

  processAttendanceItem(item: any, date: string, records: AttendanceRecord[]) {
    if (item.studentNumber) {
      records.push({ studentNumber: item.studentNumber });
    }    
  }

  // Helper method to calculate average marks for a student
  getAverageMarks(marks: Marks[]): number {
    if (!marks || marks.length === 0) return 0;
    const sum = marks.reduce((acc, mark) => acc + Number(mark.average || 0), 0);
    return Number((sum / marks.length).toFixed(2));
  }

  // Helper method to get the latest marks
  getLatestMarks(marks: Marks[]): Marks[] {
    return [...marks]
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 3);
  }
}
