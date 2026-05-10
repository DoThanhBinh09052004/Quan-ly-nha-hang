import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { RevenueComponent } from './revenue';
import { MyData } from '../../my-data';

describe('RevenueComponent', () => {
  let component: RevenueComponent;
  let fixture: ComponentFixture<RevenueComponent>;

  beforeEach(async () => {
    const myDataStub = {
      getRevenueMonthly: () => of([]),
      getRevenueDaily: () => of([]),
      getRevenueByHour: () => of([]),
      getRevenueByDayOfWeek: () => of([]),
      getRevenueBestSellers: () => of([]),
      getRevenueTableTurnover: () => of({ details: [] }),
      getRevenueByPartySize: () => of([]),
      getRevenueForecast: () => of({ historicalData: [], forecast: [] }),
      predictRevenueByAi: () => of({ date: '2026-01-01', predictedRevenue: 0 })
    };

    await TestBed.configureTestingModule({
      imports: [RevenueComponent],
      providers: [{ provide: MyData, useValue: myDataStub }]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RevenueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
