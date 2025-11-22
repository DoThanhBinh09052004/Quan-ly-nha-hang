import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ItemimageComponent } from './itemimage';

describe('ItemimageComponent', () => {
  let component: ItemimageComponent;
  let fixture: ComponentFixture<ItemimageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ItemimageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ItemimageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
