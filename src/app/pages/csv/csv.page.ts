import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import { AuthenticationService } from '../../services/auths.service';
import { AlertController } from '@ionic/angular';

import * as XLSX from 'xlsx';

@Component({
  selector: 'app-csv',
  templateUrl: './csv.page.html',
  styleUrls: ['./csv.page.scss'],
})
export class CsvPage implements OnInit {
  menuVisible: boolean = false;
  moduleCode: string = '';
  previewData: any[] = [];
  file: File | null = null;
  calculateAverage: boolean = false;
  isLoading: boolean = false;
  isToastOpen: boolean = false;
  toastMessage: string = '';
  toastColor: string = 'success';

  tests = [
    { name: 'test1', percentage: 0 },
    { name: 'test2', percentage: 0 },
    { name: 'test3', percentage: 0 },
    { name: 'test4', percentage: 0 },
    { name: 'test5', percentage: 0 },
    { name: 'test6', percentage: 0 },
    { name: 'test7', percentage: 0 },
  ];

  constructor(private firestore: AngularFirestore,private router: Router,private alertController: AlertController,private authService: AuthenticationService,

  ) { }

  openMenu() {
    this.menuVisible = !this.menuVisible;
  }
  goToStudentManagement(){
    this.router.navigate(['/student-management']);  // Ensure you have this route set up
    this.menuVisible = false;  // Hide the menu after selecting

  }
  goToMeeting() {
    this.router.navigate(['/live-meet']);  // Ensure you have this route set up
    this.menuVisible = false;  // Hide the menu after selecting
  }
  async logout() {
    try {
      await this.authService.signOut();
      this.router.navigate(['/login']); // Redirect to login page after logout
      this.menuVisible = false;  // Hide the menu after logging out
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  ngOnInit() { }

  generateSpreadsheet() {
    this.isLoading = true;
    const data = [
      ['Student Number', 'Test 1', 'Test 2', 'Test 3', 'Test 4', 'Test 5', 'Test 6', 'Test 7'],
      ['', '', '', '', '', '', '', '']
    ];

    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(data);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Marks');

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.moduleCode}_marks_template.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);

    this.isLoading = false;
    this.showToast('Template generated successfully!', 'success');
  }

  onFileChange(event: any) {
    this.file = event.target.files[0];
    this.readExcel();
  }

  readExcel() {
    if (!this.file) return;

    this.isLoading = true;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        this.previewData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        this.previewData.shift();

        this.previewData = this.previewData.map((row: any[]) => ({
          studentNumber: row[0] || '',
          test1: row[1] || '',
          test2: row[2] || '',
          test3: row[3] || '',
          test4: row[4] || '',
          test5: row[5] || '',
          test6: row[6] || '',
          test7: row[7] || ''
        }));

        if (this.calculateAverage) {
          this.calculateAverages();
        }

        this.isLoading = false;
        this.showToast('File read successfully!', 'success');
      } catch (error) {
        this.isLoading = false;
        this.showToast('Error reading file. Please check the file format.', 'danger');
      }
    };
    reader.readAsArrayBuffer(this.file);
  }

  toggleCalculateAverage() {
    if (this.calculateAverage) {
      this.calculateAverages();
    } else {
      this.previewData.forEach(student => delete student.average);
    }
  }

  calculateAverages() {
    const totalPercentage = this.tests.reduce((sum, test) => sum + test.percentage, 0);
    
    if (totalPercentage !== 100) {
      this.showToast('The sum of test percentages must equal 100%. Please adjust your percentages.', 'warning');
      return;
    }

    this.previewData = this.previewData.map(student => {
      let totalWeightedScore = 0;
      let totalWeight = 0;

      this.tests.forEach((test, index) => {
        const score = parseFloat(student[`test${index + 1}`]);
        if (!isNaN(score) && test.percentage > 0) {
          totalWeightedScore += score * (test.percentage / 100);
          totalWeight += test.percentage;
        }
      });

      const average = totalWeight > 0 ? (totalWeightedScore / (totalWeight / 100)) : 0;
      return { ...student, average: average.toFixed(2) };
    });
  }

  uploadToFirestore() {
    if (this.previewData.length === 0) {
      this.showToast('Please upload a spreadsheet first.', 'warning');
      return;
    }
    if (!this.moduleCode) {
      this.showToast('Please enter a module code.', 'warning');
      return;
    }

    const invalidEntries = this.previewData.filter(row => !row.studentNumber);
    if (invalidEntries.length > 0) {
      this.showToast('All entries must have a student number. Please check the data.', 'warning');
      return;
    }

    if (this.calculateAverage) {
      this.calculateAverages();
    }

    this.isLoading = true;
    this.firestore.collection('marks').doc(this.moduleCode).set({
      moduleCode: this.moduleCode,
      testPercentages: this.tests.reduce((obj, test) => ({ ...obj, [test.name]: test.percentage }), {}),
      marks: this.previewData
    })
    .then(() => {
      this.isLoading = false;
      this.showToast('Marks and averages uploaded successfully!', 'success');
    })
    .catch((error) => {
      this.isLoading = false;
      this.showToast('Error uploading marks: ' + error, 'danger');
    });
  }

  previewSpreadsheet() {
    if (this.previewData.length === 0) {
      this.showToast('Please upload a spreadsheet first.', 'warning');
      return;
    }
    if (this.calculateAverage) {
      this.calculateAverages();
    }
  }

  showToast(message: string, color: string) {
    this.toastMessage = message;
    this.toastColor = color;
    this.isToastOpen = true;
  }
}