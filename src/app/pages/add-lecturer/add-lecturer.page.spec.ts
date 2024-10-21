import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddLecturerPage } from './add-lecturer.page';

describe('AddLecturerPage', () => {
  let component: AddLecturerPage;
  let fixture: ComponentFixture<AddLecturerPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AddLecturerPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
