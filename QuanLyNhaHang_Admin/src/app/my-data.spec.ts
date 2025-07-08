import { Injectable } from "@angular/core";
import { environment } from "../environments/environment.development";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Restaurant } from "../model/restaurant.model";
import { Observable } from "rxjs";
import { Role } from "../model/role.model";

Injectable({
  providedIn: 'root'
})

export class DataService {
    private REST_API_SERVER = environment.api;
    private httpOptions = {
        headers: new HttpHeaders({
            'Content-Type': 'application/json',
            // Authorization: 'my-auth-token'
        })
    };

    
  
  
}