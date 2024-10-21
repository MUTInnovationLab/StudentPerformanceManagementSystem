import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CsvPage } from './csv.page';

describe('CsvPage', () => {
  let component: CsvPage;
  let fixture: ComponentFixture<CsvPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CsvPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
