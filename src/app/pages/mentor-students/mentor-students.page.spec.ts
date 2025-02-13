import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MentorStudentsPage } from './mentor-students.page';

describe('MentorStudentsPage', () => {
  let component: MentorStudentsPage;
  let fixture: ComponentFixture<MentorStudentsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MentorStudentsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
