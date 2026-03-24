import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError } from 'rxjs';
import { BaseService } from '../models/base-service';
import { ApiResponse } from '../models/api-response.model';

/**
 * ApiService provides a low-level abstraction over the standard HttpClient.
 * Wraps requests with standard error handling and base URL prefixing.
 */
@Injectable({
  providedIn: 'root'
})
export class ApiService extends BaseService {
  private http = inject(HttpClient);
  private readonly baseUrl = '/api';

  public get<T>(url: string, params?: any): Observable<T> {
    const httpParams = this.createParams(params);
    return this.http.get<T>(`${this.baseUrl}${url}`, { params: httpParams }).pipe(
      catchError(this.handleError<T>(`GET_${url.toUpperCase()}`))
    );
  }

  public post<T>(url: string, body: any): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${url}`, body).pipe(
      catchError(this.handleError<T>(`POST_${url.toUpperCase()}`))
    );
  }

  public put<T>(url: string, body: any): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}${url}`, body).pipe(
      catchError(this.handleError<T>(`PUT_${url.toUpperCase()}`))
    );
  }

  public patch<T>(url: string, body: any): Observable<T> {
    return this.http.patch<T>(`${this.baseUrl}${url}`, body).pipe(
      catchError(this.handleError<T>(`PATCH_${url.toUpperCase()}`))
    );
  }

  public delete<T>(url: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}${url}`).pipe(
      catchError(this.handleError<T>(`DELETE_${url.toUpperCase()}`))
    );
  }

  private createParams(params?: any): HttpParams {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          httpParams = httpParams.append(key, params[key]);
        }
      });
    }
    return httpParams;
  }
}
