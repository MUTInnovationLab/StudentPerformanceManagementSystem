import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Module } from '../models/faculty.model';

export interface AttendanceRecord {
  studentNumber: string;
  scanTime: string;
}

export interface DailyAttendance {
  [date: string]: AttendanceRecord[];
}

export interface ModuleAttendancePerformance {
  moduleCode: string;
  moduleName: string;
  averageAttendance: number;
  totalStudents: number;
  totalAttendanceDays: number;
  totalAttendedStudents: number;
}

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  constructor(private firestore: AngularFirestore) {}

  async getModuleAttendancePerformance(modules: Module[]): Promise<ModuleAttendancePerformance[]> {
    return await Promise.all(
      modules.map(async (module) => {
        const attendanceDoc = await this.firestore.collection('Attended').doc(module.moduleCode).get().toPromise();
        const attendance = attendanceDoc?.exists ? attendanceDoc.data() as DailyAttendance : null;

        if (!attendance) {
          return this.createEmptyAttendancePerformance(module);
        }

        return this.calculateModuleAttendanceStats(module, attendance);
      })
    );
  }

  private createEmptyAttendancePerformance(module: Module): ModuleAttendancePerformance {
    return {
      moduleCode: module.moduleCode,
      moduleName: module.moduleName,
      averageAttendance: 0,
      totalStudents: 0,
      totalAttendanceDays: 0,
      totalAttendedStudents: 0
    };
  }

  private calculateModuleAttendanceStats(
    module: Module, 
    attendance: DailyAttendance
  ): ModuleAttendancePerformance {
    const dates = Object.keys(attendance);
    const totalAttendanceDays = dates.length;
    const totalAttendedStudents = dates.reduce((sum, date) => sum + attendance[date].length, 0);
    
    // Get unique students across all dates
    const uniqueStudents = new Set<string>();
    dates.forEach(date => {
      attendance[date].forEach(record => {
        uniqueStudents.add(record.studentNumber);
      });
    });
    const totalStudents = uniqueStudents.size;

    // Calculate average attendance rate
    const averageAttendance = totalAttendanceDays > 0 && totalStudents > 0
      ? (totalAttendedStudents / (totalAttendanceDays * totalStudents)) * 100
      : 0;

    return {
      moduleCode: module.moduleCode,
      moduleName: module.moduleName,
      averageAttendance,
      totalStudents,
      totalAttendanceDays,
      totalAttendedStudents
    };
  }
}