import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { OrderComponent } from './order';
import { MyData } from '../../my-data';

describe('OrderComponent', () => {
  let component: OrderComponent;
  let fixture: ComponentFixture<OrderComponent>;
  let myData: jasmine.SpyObj<MyData>;

  beforeEach(async () => {
    myData = jasmine.createSpyObj<MyData>('MyData', [
      'getOrders',
      'getAllItems',
      'getAllAvailableGuestTables'
    ]);
    myData.getOrders.and.returnValue(of({ items: [], totalRecords: 24, todayRevenue: 500000 }));
    myData.getAllItems.and.returnValue(of([]));
    myData.getAllAvailableGuestTables.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [OrderComponent]
    })
    .overrideComponent(OrderComponent, {
      remove: { providers: [MyData] },
      add: { providers: [{ provide: MyData, useValue: myData }] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads the requested page and maps list metadata', () => {
    expect(myData.getOrders).toHaveBeenCalledWith(jasmine.objectContaining({
      page: 1,
      pageSize: 10,
      sortField: 'created',
      sortOrder: 'desc'
    }));
    expect(component.totalRecords).toBe(24);
    expect(component.todayRevenue).toBe(500000);

    component.onLazyLoad({ first: 25, rows: 25, sortField: 'totalPrice', sortOrder: 1 });

    expect(myData.getOrders).toHaveBeenCalledWith(jasmine.objectContaining({
      page: 2,
      pageSize: 25,
      sortField: 'totalPrice',
      sortOrder: 'asc'
    }));
  });

  it('debounces search and resets to the first page', fakeAsync(() => {
    component.first = 20;
    component.onGlobalFilter({ target: { value: ' bàn 3 ' } } as unknown as Event);
    tick(300);

    expect(myData.getOrders).toHaveBeenCalledWith(jasmine.objectContaining({
      page: 1,
      search: 'bàn 3'
    }));
  }));

  it('clears loading state after a request error', () => {
    myData.getOrders.and.returnValue(throwError(() => new Error('network')));

    component.loadData();

    expect(component.loadingOrders).toBeFalse();
    expect(component.orders).toEqual([]);
  });
});
