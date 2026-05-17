import { TestBed } from '@angular/core/testing';

import { Batches } from './batches';

describe('Batches', () => {
  let service: Batches;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Batches);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
