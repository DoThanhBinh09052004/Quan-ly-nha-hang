import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Statuscomponent } from './status';

describe('Status', () => {
  let component: Statuscomponent;
  let fixture: ComponentFixture<Statuscomponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Statuscomponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Statuscomponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
