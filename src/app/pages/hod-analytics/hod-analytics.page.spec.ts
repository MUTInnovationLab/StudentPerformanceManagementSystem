import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HODANALYTICSPage } from './hod-analytics.page';

describe('HODANALYTICSPage', () => {
  let component: HODANALYTICSPage;
  let fixture: ComponentFixture<HODANALYTICSPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(HODANALYTICSPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
