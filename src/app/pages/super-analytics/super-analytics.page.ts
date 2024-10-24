import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { AlertController } from '@ionic/angular';

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

interface AttendanceWithStudent extends AttendanceRecord {
  studentDetails?: Student;
}

@Component({
  selector: 'app-super-analytics',
  templateUrl: './super-analytics.page.html',
  styleUrls: ['./super-analytics.page.scss']
})
export class SuperAnalyticsPage implements OnInit {
  attendanceRecords$: Observable<{ date: string; records: AttendanceWithStudent[]; }[]> | undefined;

  constructor(
    private firestore: AngularFirestore,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.loadAttendanceData();
  }

  private validateAttendanceRecord(item: any, date: string): { isValid: boolean; record?: AttendanceRecord; errors?: string[] } {
    const errors: string[] = [];
    
    // Deep inspection of the item
    console.log(`Validating item for date ${date}:`, JSON.stringify(item, null, 2));
    
    // If item is an array with one element, use that element
    if (Array.isArray(item) && item.length === 1) {
      item = item[0];
    }
    
    // Check if item is nested in a property
    const itemData = Object.values(item).length === 1 ? Object.values(item)[0] : item;
    
    const studentNumber = itemData.studentNumber || itemData.StudentNumber || itemData.studentnumber;

    if (!studentNumber) {
      errors.push(`studentNumber is missing (available fields: ${Object.keys(itemData).join(', ')})`);
    }

    if (errors.length === 0) {
      return {
        isValid: true,
        record: {
          id: date,
          studentNumber: studentNumber
        }
      };
    }

    return {
      isValid: false,
      errors
    };
  }

  private processAttendanceItem(item: any, date: string, records: AttendanceRecord[]) {
    // Log the raw item structure
    console.log(`Processing item for date ${date}:`, {
      rawItem: item,
      type: typeof item,
      isArray: Array.isArray(item),
      keys: Object.keys(item)
    });

    const validation = this.validateAttendanceRecord(item, date);
    
    if (validation.isValid && validation.record) {
      records.push(validation.record);
    } else {
      console.warn(
        `Invalid attendance record for date ${date}:`,
        '\nRecord data:', JSON.stringify(item, null, 2),
        '\nErrors:', validation.errors?.join(', ')
      );
    }
  }

  private loadAttendanceData() {
    // Get all students first
    const students$ = this.firestore
      .collection<Student>('students')
      .snapshotChanges()
      .pipe(
        map(actions => {
          const students: { [key: string]: Student } = {};
          actions.forEach(action => {
            const data = action.payload.doc.data() as { 
              name: string; 
              surname: string; 
              email: string; 
              course: string; 
              year: string; 
              department: string; 
            };
            const id = action.payload.doc.id;
            // Create the Student object with all required fields
            students[id] = { ...data, studentNumber: id };
          });
          return students;
        })
      );

    // Get attendance records
    const attendance$ = this.firestore
      .collection('Attended')
      .snapshotChanges()
      .pipe(
        map(actions => {
          const records: { [date: string]: AttendanceRecord[] } = {};
          
          actions.forEach(action => {
            const data = action.payload.doc.data() as { [key: string]: any }; // Keep the existing assertion for attendance data
            const date = action.payload.doc.id;

            if (!records[date]) {
              records[date] = [];
            }

            if (Array.isArray(data)) {
              data.forEach(item => {
                this.processAttendanceItem(item, date, records[date]);
              });
            } else if (typeof data === 'object' && data !== null) {
              // Handle nested data
              if (Object.keys(data).length === 1 && Array.isArray(Object.values(data)[0])) {
                Object.values(data)[0].forEach((item: any) => {
                  this.processAttendanceItem(item, date, records[date]);
                });
              } else {
                Object.values(data).forEach(item => {
                  this.processAttendanceItem(item, date, records[date]);
                });
              }
            } else {
              console.error(`Invalid data structure for date ${date}:`, data);
            }
          });

          return records;
        })
      );

    // Combine students and attendance data
    this.attendanceRecords$ = combineLatest([attendance$, students$]).pipe(
      map(([attendanceRecords, students]) => {
        return Object.entries(attendanceRecords)
          .map(([date, records]) => ({
            date,
            records: records.map(record => ({
              ...record,
              studentDetails: students[record.studentNumber]
            }))
          }))
          .sort((a, b) => b.date.localeCompare(a.date));
      })
    );
  }

  async showStudentDetails(record: AttendanceWithStudent) {
    const studentDetails = record.studentDetails;
    const alert = await this.alertController.create({
      header: 'Student Details',
      subHeader: `Attendance Code: ${record.id}`,
      message: `
        <div class="student-details">
          <p><strong>Student Number:</strong> ${record.studentNumber}</p>
          <p><strong>Name:</strong> ${studentDetails?.name || 'N/A'}</p>
          <p><strong>Surname:</strong> ${studentDetails?.surname || 'N/A'}</p>
          <p><strong>Email:</strong> ${studentDetails?.email || 'N/A'}</p>
          <p><strong>Course:</strong> ${studentDetails?.course || 'N/A'}</p>
          <p><strong>Year:</strong> ${studentDetails?.year || 'N/A'}</p>
          <p><strong>Department:</strong> ${studentDetails?.department || 'N/A'}</p>
        </div>
      `,
      buttons: ['Close']
    });

    await alert.present();
  }
}
