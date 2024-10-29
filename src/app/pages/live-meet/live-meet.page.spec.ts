import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LiveMeetPage } from './live-meet.page';

describe('LiveMeetPage', () => {
  let component: LiveMeetPage;
  let fixture: ComponentFixture<LiveMeetPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(LiveMeetPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
