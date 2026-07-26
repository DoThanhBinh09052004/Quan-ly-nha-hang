import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MyData } from './my-data';

describe('MyData order pagination', () => {
  let service: MyData;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(MyData);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('sends the order paging, search, and sorting parameters', () => {
    service.getOrders({
      page: 2,
      pageSize: 25,
      search: ' A-001 ',
      sortField: 'totalPrice',
      sortOrder: 'asc'
    }).subscribe();

    const request = httpMock.expectOne((candidate) => candidate.url.endsWith('/order'));
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('pageSize')).toBe('25');
    expect(request.request.params.get('search')).toBe('A-001');
    expect(request.request.params.get('sortField')).toBe('totalPrice');
    expect(request.request.params.get('sortOrder')).toBe('asc');
    request.flush({ items: [], totalRecords: 0, todayRevenue: 0 });
  });
});
