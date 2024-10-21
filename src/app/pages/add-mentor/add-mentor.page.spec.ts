import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddMentorPage } from './add-mentor.page';

describe('AddMentorPage', () => {
  let component: AddMentorPage;
  let fixture: ComponentFixture<AddMentorPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AddMentorPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
