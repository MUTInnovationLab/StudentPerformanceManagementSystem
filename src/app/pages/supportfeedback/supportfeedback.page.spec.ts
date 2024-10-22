import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SupportfeedbackPage } from './supportfeedback.page';

describe('SupportfeedbackPage', () => {
  let component: SupportfeedbackPage;
  let fixture: ComponentFixture<SupportfeedbackPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SupportfeedbackPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
