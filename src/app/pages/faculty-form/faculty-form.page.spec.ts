import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FacultyFormPage } from './faculty-form.page';

describe('FacultyFormPage', () => {
  let component: FacultyFormPage;
  let fixture: ComponentFixture<FacultyFormPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(FacultyFormPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
