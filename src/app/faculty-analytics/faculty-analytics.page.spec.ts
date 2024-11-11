import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FacultyAnalyticsPage } from './faculty-analytics.page';

describe('FacultyAnalyticsPage', () => {
  let component: FacultyAnalyticsPage;
  let fixture: ComponentFixture<FacultyAnalyticsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(FacultyAnalyticsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
