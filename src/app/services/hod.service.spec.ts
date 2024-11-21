import { TestBed } from '@angular/core/testing';

import { HodService } from './hod.service';

describe('HodService', () => {
  let service: HodService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HodService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
