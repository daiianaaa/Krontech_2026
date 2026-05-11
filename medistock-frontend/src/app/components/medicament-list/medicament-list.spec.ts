import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MedicamentListComponent } from './medicament-list';

describe('MedicamentList', () => {
  let component: MedicamentListComponent;
  let fixture: ComponentFixture<MedicamentListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MedicamentListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MedicamentListComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
