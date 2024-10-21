import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ViewStaffPage } from './view-staff.page';

describe('ViewStaffPage', () => {
  let component: ViewStaffPage;
  let fixture: ComponentFixture<ViewStaffPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ViewStaffPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
