import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransferManagement } from './transfer-management';

describe('TransferManagement', () => {
  let component: TransferManagement;
  let fixture: ComponentFixture<TransferManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransferManagement],
    }).compileComponents();

    fixture = TestBed.createComponent(TransferManagement);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
