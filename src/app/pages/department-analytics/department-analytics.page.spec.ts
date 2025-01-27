import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DepartmentAnalyticsPage } from './department-analytics.page';

describe('DepartmentAnalyticsPage', () => {
  let component: DepartmentAnalyticsPage;
  let fixture: ComponentFixture<DepartmentAnalyticsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DepartmentAnalyticsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
