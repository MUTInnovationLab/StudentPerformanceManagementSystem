import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Module } from '../models/faculty.model';
import { AttendanceRecord, DailyAttendance } from '../models/attendancePerfomance.model';
import { StudentModuleAttendance, StudentAttendanceReport } from '../models/studentAttendance.model';

export interface ModuleAttendancePerformance {
  moduleCode: string;
  moduleName: string;
  averageAttendance: number;
  totalStudents: number;
  totalEnrolledStudents: number;
  totalAttendanceDays: number;
  totalAttendedStudents: number;
}

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  private attendanceCache = new Map<string, ModuleAttendancePerformance[]>();

  constructor(private firestore: AngularFirestore) {}

  async getModuleAttendancePerformance(
    modules: Module[],
    selectedMonth?: string,
    timeframe: 'month' | 'all' = 'month'
  ): Promise<ModuleAttendancePerformance[]> {
    const cacheKey = `${modules.map(m => m.moduleCode).join(',')}-${selectedMonth}-${timeframe}`;
    if (this.attendanceCache.has(cacheKey)) {
      return this.attendanceCache.get(cacheKey)!;
    }

    const enrolledStudentsMap = await this.getEnrolledStudentsForModules(modules);

    const performance = await Promise.all(
      modules.map(async (module) => {
        const attendanceDoc = await this.firestore
          .collection('Attended')
          .doc(module.moduleCode.trim())
          .get()
          .toPromise();

        const attendance = attendanceDoc?.exists 
          ? attendanceDoc.data() as DailyAttendance 
          : null;

        const totalEnrolledStudents = enrolledStudentsMap.get(module.moduleCode.trim()) || 0;

        if (!attendance) {
          return this.createEmptyAttendancePerformance(module, totalEnrolledStudents);
        }

        return this.calculateModuleAttendanceStats(
          module, 
          attendance, 
          totalEnrolledStudents, 
          selectedMonth,
          timeframe
        );
      })
    );

    this.attendanceCache.set(cacheKey, performance);
    return performance;
  }

  private async getEnrolledStudentsForModules(modules: Module[]): Promise<Map<string, number>> {
    const enrolledStudentsMap = new Map<string, number>();

    // Fetch enrolled modules for all module codes
    const moduleCodePromises = modules.map(async (module) => {
      const moduleCode = module.moduleCode.trim();
      const enrolledDoc = await this.firestore
        .collection('enrolledModules')
        .doc(moduleCode)
        .get()
        .toPromise();

      if (enrolledDoc?.exists) {
        const enrolledData = enrolledDoc.data() as { 
          Enrolled?: Array<{
            studentNumber: string, 
            status: string
          }> 
        };

        // Count only students with 'Enrolled' status
        const enrolledStudents = enrolledData?.Enrolled?.filter(
          student => student.status === 'Enrolled'
        ) || [];

        enrolledStudentsMap.set(moduleCode, enrolledStudents.length);
      } else {
        enrolledStudentsMap.set(moduleCode, 0);
      }
    });

    await Promise.all(moduleCodePromises);
    return enrolledStudentsMap;
  }

  private createEmptyAttendancePerformance(
    module: Module, 
    totalEnrolledStudents: number
  ): ModuleAttendancePerformance {
    return {
      moduleCode: module.moduleCode,
      moduleName: module.moduleName,
      averageAttendance: 0,
      totalStudents: totalEnrolledStudents, // Directly set to totalEnrolledStudents
      totalEnrolledStudents,
      totalAttendanceDays: 0,
      totalAttendedStudents: 0
    };
  }

  private calculateModuleAttendanceStats(
    module: Module,
    attendance: DailyAttendance,
    totalEnrolledStudents: number,
    selectedMonth?: string,
    timeframe: 'month' | 'all' = 'month'
  ): ModuleAttendancePerformance {
    let dates = Object.keys(attendance);

    // Filter dates based on timeframe
    if (timeframe === 'month' && selectedMonth) {
      dates = dates.filter(date => date.startsWith(selectedMonth));
    }
    // When timeframe is 'all', we use all dates

    const totalAttendanceDays = dates.length;

    // Track unique students who attended
    const attendedStudents = new Set<string>();
    
    // Total students who attended across all dates
    const totalAttendedStudents = dates.reduce((sum, date) => {
      const dailyAttendance = attendance[date] || [];
      dailyAttendance.forEach(record => {
        attendedStudents.add(record.studentNumber);
      });
      return sum + dailyAttendance.length;
    }, 0);

    // Calculate average attendance rate
    const averageAttendance = totalAttendanceDays > 0 && totalEnrolledStudents > 0
      ? (totalAttendedStudents / (totalAttendanceDays * totalEnrolledStudents)) * 100
      : 0;

    return {
      moduleCode: module.moduleCode,
      moduleName: module.moduleName,
      averageAttendance,
      totalStudents: totalEnrolledStudents,
      totalEnrolledStudents,
      totalAttendanceDays,
      totalAttendedStudents: attendedStudents.size
    };
  }

  async getAvailableMonths(moduleCode: string): Promise<string[]> {
    const attendanceDoc = await this.firestore
      .collection('Attended')
      .doc(moduleCode.trim())
      .get()
      .toPromise();

    if (!attendanceDoc?.exists) return [];

    const attendance = attendanceDoc.data() as DailyAttendance;
    const dates = Object.keys(attendance);

    // Extract unique YYYY-MM combinations
    const uniqueMonths = new Set(
      dates.map(date => date.substring(0, 7))
    );

    return Array.from(uniqueMonths).sort();
  }

  async getStudentAttendanceForModules(studentNumber: string, modules: Module[]): Promise<{ [moduleCode: string]: string }> {
    const attendanceMap: { [moduleCode: string]: string } = {};

    for (const module of modules) {
      const attendanceDoc = await this.firestore
        .collection('Attended')
        .doc(module.moduleCode.trim())
        .get()
        .toPromise();

      if (attendanceDoc?.exists) {
        const attendance = attendanceDoc.data() as DailyAttendance;
        for (const date in attendance) {
          const dailyAttendance = attendance[date];
          const record = dailyAttendance.find(record => record.studentNumber === studentNumber);
          if (record) {
            attendanceMap[module.moduleCode] = record.scanTime;
            break;
          }
        }
      }
    }

    return attendanceMap;
  }

  async getStudentAttendanceReport(studentNumber: string): Promise<StudentAttendanceReport> {
    // Get all modules from assignedLectures
    const assignedModulesSnapshot = await this.firestore
      .collection('assignedLectures')
      .get()
      .toPromise();

    const modules: StudentModuleAttendance[] = [];
    let totalAttendancePercentage = 0;

    for (const doc of assignedModulesSnapshot!.docs) {
      const assignedLectures = doc.data() as { modules: Module[] };
      
      for (const module of assignedLectures.modules) {
        const attendance = await this.calculateStudentModuleAttendance(
          studentNumber,
          module
        );
        
        if (attendance) {
          modules.push(attendance);
          totalAttendancePercentage += attendance.attendancePercentage;
        }
      }
    }

    return {
      studentNumber,
      modules,
      overallAttendance: modules.length > 0 
        ? totalAttendancePercentage / modules.length 
        : 0
    };
  }

  private async calculateStudentModuleAttendance(
    studentNumber: string,
    module: Module
  ): Promise<StudentModuleAttendance> {
    const attendanceDoc = await this.firestore
      .collection('Attended')
      .doc(module.moduleCode)
      .get()
      .toPromise();

    const attendance = attendanceDoc?.data() as DailyAttendance;
    const attendanceDates: string[] = [];
    let lastAttendance: string | undefined;
    
    // Count total sessions from available attendance dates
    const totalSessions = attendance ? Object.keys(attendance).length : 0;

    if (attendance) {
      Object.entries(attendance).forEach(([date, records]) => {
        const studentPresent = records.some(
          record => record.studentNumber === studentNumber
        );
        if (studentPresent) {
          attendanceDates.push(date);
          lastAttendance = date;
        }
      });
    }

    const attendedSessions = attendanceDates.length;
    const attendancePercentage = totalSessions > 0 
      ? (attendedSessions / totalSessions) * 100 
      : 0;

    return {
      moduleCode: module.moduleCode,
      moduleName: module.moduleName,
      totalSessions,
      attendedSessions,
      attendancePercentage,
      lastAttendance,
      attendanceDates
    };
  }

  async getModuleAttendanceForStudent(
    studentNumber: string,
    moduleCode: string
  ): Promise<StudentModuleAttendance | null> {
    const moduleDoc = await this.firestore
      .collection('assignedLectures')
      .get()
      .toPromise();

    let targetModule: Module | null = null;

    moduleDoc?.docs.forEach(doc => {
      const assignedLectures = doc.data() as { modules: Module[] };
      const foundModule = assignedLectures.modules.find(
        m => m.moduleCode === moduleCode
      );
      if (foundModule) {
        targetModule = foundModule;
      }
    });

    if (!targetModule) {
      return null;
    }

    return this.calculateStudentModuleAttendance(studentNumber, targetModule);
  }
}