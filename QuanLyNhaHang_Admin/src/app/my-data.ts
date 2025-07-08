import { Injectable } from "@angular/core";
import { environment } from "../environments/environment.development";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Restaurant } from "../model/restaurant.model";
import { Observable } from "rxjs";
import { Role } from "../model/role.model";

@Injectable({
  providedIn: 'root'
})
export class MyData {

  private REST_API_SERVER = environment.api;
  private httpOptions = {
      headers: new HttpHeaders({
          'Content-Type': 'application/json',
      })
  };

  constructor(private httpClient: HttpClient) {}

  public getAllRestaurants(): Observable<Restaurant[]> {
      const url = `${this.REST_API_SERVER}/restaurant`;
      return this.httpClient.get<Restaurant[]>(url, this.httpOptions);
  }
  public postRestaurant(restaurant: Restaurant): Observable<Restaurant> {
    const url = `${this.REST_API_SERVER}/restaurant`;
    return this.httpClient.post<Restaurant>(url, restaurant, this.httpOptions);
}
  public getAllRoles(): Observable<Role[]> {
    const url = `${this.REST_API_SERVER}/role`;
    return this.httpClient.get<Role[]>(url, this.httpOptions);
}
}
