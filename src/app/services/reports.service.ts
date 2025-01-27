import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DetailedStudentInfo } from '../models/studentsMarks.model';
import * as XLSX from 'xlsx';

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private readonly PERFORMANCE_LEVELS = {
    AT_RISK: { min: 0, max: 49, label: 'At Risk' },
    PARTIAL: { min: 50, max: 59, label: 'Partial Pass' },
    INTERMEDIATE: { min: 60, max: 74, label: 'Intermediate Pass' },
    DISTINCTION: { min: 75, max: 100, label: 'Distinction' }
  };

  constructor() { }

  generateDepartmentReport(
    departmentName: string,
    students: DetailedStudentInfo[],
    performanceStats: any
  ): jsPDF {
    const doc = new jsPDF();
    let yPos = 20;

    // Add header
    doc.setFontSize(15);
    doc.text(`Department Performance Report: ${departmentName}`, 14, yPos);
    
    yPos += 25; // Increased spacing after title

    // Add summary statistics
    doc.setFontSize(12);
    doc.text('Performance Summary:', 14, yPos);
    yPos += 15; // Increased spacing before summary table

    const summaryData = [
      ['Performance Level', 'Count', 'Percentage'],
      ['At Risk (0-49%)', performanceStats.atRisk.count, this.calculatePercentage(performanceStats.atRisk.count, students.length)],
      ['Partial Pass (50-59%)', performanceStats.partialPass.count, this.calculatePercentage(performanceStats.partialPass.count, students.length)],
      ['Intermediate (60-74%)', performanceStats.intermediatePass.count, this.calculatePercentage(performanceStats.intermediatePass.count, students.length)],
      ['Distinction (75-100%)', performanceStats.distinction.count, this.calculatePercentage(performanceStats.distinction.count, students.length)],
      ['Total Students', students.length, '100%']
    ];

    autoTable(doc, {
      startY: yPos,
      head: [summaryData[0]],
      body: summaryData.slice(1),
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] }
    });

    yPos = (doc as any).lastAutoTable.finalY + 30; // Increased spacing after summary

    // Add detailed student lists by performance category with proper spacing
    yPos = this.addPerformanceSection(doc, 'At Risk Students (0-49%)', performanceStats.atRisk.students, yPos);
    yPos = this.addPerformanceSection(doc, 'Partial Pass Students (50-59%)', performanceStats.partialPass.students, yPos);
    yPos = this.addPerformanceSection(doc, 'Intermediate Pass Students (60-74%)', performanceStats.intermediatePass.students, yPos);
    yPos = this.addPerformanceSection(doc, 'Distinction Students (75-100%)', performanceStats.distinction.students, yPos);

    // Add footer with date
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, doc.internal.pageSize.height - 10);
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
    }

    return doc;
  }

  generateStudentReport(student: DetailedStudentInfo): jsPDF {
    const doc = new jsPDF();
    let yPos = 20;

    // Header
    doc.setFontSize(18);
    doc.text('Student Performance Report', 14, yPos);
    
    yPos += 20;

    // Student Information
    doc.setFontSize(12);
    const studentInfo = [
      ['Student Number:', student.studentNumber],
      ['Name:', `${student.name} ${student.surname}`],
      ['Email:', student.email],
      ['Department:', student.department],
      ['Module:', student.moduleName],
      ['Average:', `${student.average}%`],
      ['Performance Level:', this.getPerformanceLevel(student.average)]
    ];

    autoTable(doc, {
      startY: yPos,
      body: studentInfo,
      theme: 'plain',
      styles: { cellPadding: 2 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 20;

    // Test Marks
    const testMarks = Object.entries(student.marks)
      .filter(([key, value]) => key.startsWith('test') && value !== undefined)
      .map(([key, value]) => [key.replace('test', 'Test '), `${value}%`]);

    if (testMarks.length > 0) {
      doc.text('Test Marks:', 14, yPos);
      yPos += 10;

      autoTable(doc, {
        startY: yPos,
        head: [['Test', 'Mark']],
        body: testMarks,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] }
      });
    }

    // Add footer
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, doc.internal.pageSize.height - 10);

    return doc;
  }

  private addPerformanceSection(doc: jsPDF, title: string, students: DetailedStudentInfo[], startY?: number): number {
    if (!students || students.length === 0) return startY || (doc as any).lastAutoTable.finalY;

    // Calculate if we need a new page
    const estimatedTableHeight = (students.length + 2) * 8; // 8mm per row including header
    const currentY = startY || (doc as any).lastAutoTable.finalY + 15;
    const pageHeight = doc.internal.pageSize.height;
    
    // Add new page if not enough space
    if (currentY + estimatedTableHeight > pageHeight - 20) {
      doc.addPage();
      startY = 20;
    }

    // Add section title
    doc.setFontSize(12);
    doc.text(title, 14, startY || 20);

    const tableData = students.map(student => [
      student.studentNumber,
      `${student.name} ${student.surname}`,
      student.moduleName,
      `${student.average}%`
    ]);

    autoTable(doc, {
      startY: (startY || 20) + 10,
      head: [[
        'Student Number',
        'Student Name',
        'Module',
        'Average'
      ]],
      body: tableData,
      theme: 'striped',
      headStyles: { 
        fillColor: [41, 128, 185],
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'left',
        cellPadding: 3
      },
      bodyStyles: {
        fontSize: 9,
        cellPadding: 2
      },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 60 },
        2: { cellWidth: 60 },
        3: { cellWidth: 25 }
      },
      margin: { top: 30, bottom: 15 },
      didDrawPage: (data) => {
        // Header for continued pages
        if (data.pageNumber > 1) {
          doc.setFontSize(10);
          doc.text(`${title} (continued)`, data.settings.margin.left, 10);
        }
      }
    });

    // Return the final Y position plus spacing
    return (doc as any).lastAutoTable.finalY + 15;
  }

  private calculatePercentage(count: number, total: number): string {
    return `${((count / total) * 100).toFixed(1)}%`;
  }

  private getPerformanceLevel(average: number): string {
    if (average >= this.PERFORMANCE_LEVELS.DISTINCTION.min) return this.PERFORMANCE_LEVELS.DISTINCTION.label;
    if (average >= this.PERFORMANCE_LEVELS.INTERMEDIATE.min) return this.PERFORMANCE_LEVELS.INTERMEDIATE.label;
    if (average >= this.PERFORMANCE_LEVELS.PARTIAL.min) return this.PERFORMANCE_LEVELS.PARTIAL.label;
    return this.PERFORMANCE_LEVELS.AT_RISK.label;
  }

  generateDepartmentExcel(
    departmentName: string,
    students: DetailedStudentInfo[],
    performanceStats: any
  ): void {
    const wb = XLSX.utils.book_new();
    
    // Add title worksheet
    const titleData = [
      [`Department Performance Report: ${departmentName}`],
      [`Generated on: ${new Date().toLocaleDateString()}`],
      [],  // Empty row for spacing
    ];
    const titleWS = XLSX.utils.aoa_to_sheet(titleData);
    XLSX.utils.book_append_sheet(wb, titleWS, 'Cover');

    // Performance Summary sheet
    const summaryData = [
      ['Performance Summary'],
      [],
      ['Performance Level', 'Count', 'Percentage', 'Range'],
      ['At Risk', performanceStats.atRisk.count, this.calculatePercentage(performanceStats.atRisk.count, students.length), '0-49%'],
      ['Partial Pass', performanceStats.partialPass.count, this.calculatePercentage(performanceStats.partialPass.count, students.length), '50-59%'],
      ['Intermediate Pass', performanceStats.intermediatePass.count, this.calculatePercentage(performanceStats.intermediatePass.count, students.length), '60-74%'],
      ['Distinction', performanceStats.distinction.count, this.calculatePercentage(performanceStats.distinction.count, students.length), '75-100%'],
      [],
      ['Total Students', students.length, '100%', '']
    ];

    const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWS, 'Summary');

    // Detailed Performance sheets - Fix the sheet names
    this.addDetailedPerformanceSheet(wb, 'At Risk', performanceStats.atRisk.students);
    this.addDetailedPerformanceSheet(wb, 'Partial Pass', performanceStats.partialPass.students);
    this.addDetailedPerformanceSheet(wb, 'Intermediate Pass', performanceStats.intermediatePass.students);
    this.addDetailedPerformanceSheet(wb, 'Distinction', performanceStats.distinction.students);

    // All Students sheet with complete data
    this.addAllStudentsSheet(wb, students);

    // Save Excel file
    const fileName = `${departmentName}_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }

  private addDetailedPerformanceSheet(wb: XLSX.WorkBook, sheetName: string, students: DetailedStudentInfo[]): void {
    if (!students || students.length === 0) return;

    const headers = [
      'Student Number',
      'Student Name',
      'Email',
      'Department',
      'Module',
      'Average (%)',
      'Test 1 (%)',
      'Test 2 (%)',
      'Test 3 (%)',
      'Test 4 (%)',
      'Test 5 (%)',
      'Test 6 (%)',
      'Test 7 (%)'
    ];

    const data = students.map(student => [
      student.studentNumber,
      `${student.name} ${student.surname}`,
      student.email,
      student.department,
      student.moduleName,
      student.average,
      student.marks.test1 || '',
      student.marks.test2 || '',
      student.marks.test3 || '',
      student.marks.test4 || '',
      student.marks.test5 || '',
      student.marks.test6 || '',
      student.marks.test7 || ''
    ]);

    const ws = XLSX.utils.aoa_to_sheet([
      [`${sheetName} (${this.getPerformanceLevelRange(sheetName)})`],
      [],  // Empty row for spacing
      headers,
      ...data
    ]);

    // Set column widths
    const colWidths = [
      { wch: 15 },  // Student Number
      { wch: 25 },  // Name
      { wch: 30 },  // Email
      { wch: 20 },  // Department
      { wch: 20 },  // Module
      { wch: 10 },  // Average
      { wch: 10 },  // Test marks...
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 }
    ];
    ws['!cols'] = colWidths;

    // Fix: Keep the full sheet name without replacing 'Students'
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  private addAllStudentsSheet(wb: XLSX.WorkBook, students: DetailedStudentInfo[]): void {
    const headers = [
      'Student Number',
      'Student Name',
      'Email',
      'Department',
      'Module',
      'Average (%)',
      'Performance Level',
      'Test 1 (%)',
      'Test 2 (%)',
      'Test 3 (%)',
      'Test 4 (%)',
      'Test 5 (%)',
      'Test 6 (%)',
      'Test 7 (%)'
    ];

    const data = students.map(student => [
      student.studentNumber,
      `${student.name} ${student.surname}`,
      student.email,
      student.department,
      student.moduleName,
      student.average,
      this.getPerformanceLevel(student.average),
      student.marks.test1 || '',
      student.marks.test2 || '',
      student.marks.test3 || '',
      student.marks.test4 || '',
      student.marks.test5 || '',
      student.marks.test6 || '',
      student.marks.test7 || ''
    ]);

    const ws = XLSX.utils.aoa_to_sheet([
      ['Complete Student Performance Data'],
      [],  // Empty row for spacing
      headers,
      ...data
    ]);

    // Set column widths
    const colWidths = [
      { wch: 15 },  // Student Number
      { wch: 25 },  // Name
      { wch: 30 },  // Email
      { wch: 20 },  // Department
      { wch: 20 },  // Module
      { wch: 10 },  // Average
      { wch: 15 },  // Performance Level
      { wch: 10 },  // Test marks...
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 }
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'All Students');
  }

  private getPerformanceLevelRange(sheetName: string): string {
    if (sheetName.includes('At Risk')) return '0-49%';
    if (sheetName.includes('Partial')) return '50-59%';
    if (sheetName.includes('Intermediate')) return '60-74%';
    if (sheetName.includes('Distinction')) return '75-100%';
    return '';
  }
}
