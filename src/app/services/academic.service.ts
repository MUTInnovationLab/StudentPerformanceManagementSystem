import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Module, StudentMarks, TestPercentages } from '../models/faculty.model';
import{ModuleAcademicPerformance}from '../models/departmentPerfomance.model';

@Injectable({
  providedIn: 'root'
})
export class AcademicService {
  private academicCache = new Map<string, ModuleAcademicPerformance[]>();

  constructor(private firestore: AngularFirestore) {}

  async getModuleAcademicPerformance(modules: Module[]): Promise<ModuleAcademicPerformance[]> {
    const cacheKey = modules.map(m => m.moduleCode).join(',');
    if (this.academicCache.has(cacheKey)) {
      return this.academicCache.get(cacheKey)!;
    }

    const performance = await Promise.all(
      modules.map(async (module) => {
        const marksDoc = await this.firestore.collection('marks').doc(module.moduleCode).get().toPromise();
        const marks = marksDoc?.exists ? marksDoc.data() as { marks: StudentMarks[], testPercentages: TestPercentages } : null;

        return {
          moduleCode: module.moduleCode,
          moduleName: module.moduleName,
          averageMarks: marks ? this.calculateModuleAverage(marks.marks, marks.testPercentages) : 0,
          totalStudents: marks?.marks.length || 0
        };
      })
    );

    this.academicCache.set(cacheKey, performance);
    return performance;
  }

  private calculateModuleAverage(marks: StudentMarks[], testPercentages: TestPercentages): number {
    if (!marks.length) return 0;

    return marks.reduce((sum, mark) => {
      let totalWeightedScore = 0;
      let totalWeight = 0;

      // Calculate weighted average based on test percentages
      Object.entries(testPercentages).forEach(([testKey, weight]) => {
        const score = Number(mark[testKey as keyof StudentMarks]);
        if (!isNaN(score) && weight) {
          totalWeightedScore += (score * weight);
          totalWeight += weight;
        }
      });

      return sum + (totalWeight > 0 ? totalWeightedScore / totalWeight : 0);
    }, 0) / marks.length;
  }
}