import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StrugglingStudentsPage } from './struggling-students.page';

describe('StrugglingStudentsPage', () => {
  let component: StrugglingStudentsPage;
  let fixture: ComponentFixture<StrugglingStudentsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(StrugglingStudentsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
