import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GuesttableComponent } from './guesttable';

describe('Guesttable', () => {
  let component: GuesttableComponent;
  let fixture: ComponentFixture<GuesttableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuesttableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GuesttableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
