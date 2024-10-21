import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SuperAnalyticsPage } from './super-analytics.page';

describe('SuperAnalyticsPage', () => {
  let component: SuperAnalyticsPage;
  let fixture: ComponentFixture<SuperAnalyticsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SuperAnalyticsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
