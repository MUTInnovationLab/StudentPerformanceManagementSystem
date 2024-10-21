import { TestBed } from '@angular/core/testing';

import { AddUpdateService } from './add-update.service';

describe('AddUpdateService', () => {
  let service: AddUpdateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AddUpdateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
