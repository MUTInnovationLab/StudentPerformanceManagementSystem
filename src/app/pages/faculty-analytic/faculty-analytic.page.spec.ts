import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FacultyAnalyticPage } from './faculty-analytic.page';

describe('FacultyAnalyticPage', () => {
  let component: FacultyAnalyticPage;
  let fixture: ComponentFixture<FacultyAnalyticPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(FacultyAnalyticPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
