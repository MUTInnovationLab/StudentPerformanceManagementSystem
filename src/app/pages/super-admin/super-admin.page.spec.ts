import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SuperAdminPage } from './super-admin.page';

describe('SuperAdminPage', () => {
  let component: SuperAdminPage;
  let fixture: ComponentFixture<SuperAdminPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SuperAdminPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
