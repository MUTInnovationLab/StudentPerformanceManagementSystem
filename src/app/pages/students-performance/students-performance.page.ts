import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-students-performance',
  templateUrl: './students-performance.page.html',
  styleUrls: ['./students-performance.page.scss'],
})
export class StudentsPerformancePage implements OnInit {
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

  constructor(private firestore: AngularFirestore) { }

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
    const target: DataTransfer = <DataTransfer>(event.target);
    if (target.files.length !== 1) throw new Error('Cannot use multiple files');

    const reader: FileReader = new FileReader();
    reader.onload = (e: any) => {
      const bstr: string = e.target.result;
      const wb: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary' });

      /* Grab first sheet */
      const wsname: string = wb.SheetNames[0];
      const ws: XLSX.WorkSheet = wb.Sheets[wsname];

      /* Save data */
      const data = <any[][]>(XLSX.utils.sheet_to_json(ws, { header: 1 }));

      this.previewData = data.slice(1).map(row => {
        return {
          studentNumber: row[0],
          test1: row[1],
          test2: row[2],
          test3: row[3],
          test4: row[4],
          test5: row[5],
          test6: row[6],
          test7: row[7],
          test1Class: '',
          test2Class: '',
          test3Class: '',
          test4Class: '',
          test5Class: '',
          test6Class: '',
          test7Class: ''
        };
      });
    };
    reader.readAsBinaryString(target.files[0]);
  }

  getScoreClass(score: number, percentage: number): string {
    const result = (score / percentage) * 100;
    if (result < 50) {
      return 'failed';
    } else if (result < 75) {
      return 'average';
    } else {
      return 'good';
    }
  }

  visualizePerformance() {
    this.previewData = this.previewData.map(row => ({
      ...row,
      test1Class: this.getScoreClass(row.test1, this.tests[0].percentage),
      test2Class: this.getScoreClass(row.test2, this.tests[1].percentage),
      test3Class: this.getScoreClass(row.test3, this.tests[2].percentage),
      test4Class: this.getScoreClass(row.test4, this.tests[3].percentage),
      test5Class: this.getScoreClass(row.test5, this.tests[4].percentage),
      test6Class: this.getScoreClass(row.test6, this.tests[5].percentage),
      test7Class: this.getScoreClass(row.test7, this.tests[6].percentage)
    }));
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
          test7: row[7] || '',
          test1Class: '',
          test2Class: '',
          test3Class: '',
          test4Class: '',
          test5Class: '',
          test6Class: '',
          test7Class: ''
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
