import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StudentsPerformancePage } from './students-performance.page';

describe('StudentsPerformancePage', () => {
  let component: StudentsPerformancePage;
  let fixture: ComponentFixture<StudentsPerformancePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(StudentsPerformancePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
