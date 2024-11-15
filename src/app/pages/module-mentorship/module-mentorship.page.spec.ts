import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModuleMentorshipPage } from './module-mentorship.page';

describe('ModuleMentorshipPage', () => {
  let component: ModuleMentorshipPage;
  let fixture: ComponentFixture<ModuleMentorshipPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ModuleMentorshipPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
