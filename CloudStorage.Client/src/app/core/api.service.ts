import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.apiUrl;
  private http = inject(HttpClient);

  private formatErrors(error: HttpErrorResponse) {
    console.error('API Error:', error);
    return throwError(() => error);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get<T>(path: string, params: HttpParams = new HttpParams(), options: any = {}): Observable<T> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.http.get<T>(`${this.baseUrl}${path}`, { params, ...options } as any).pipe(catchError(this.formatErrors)) as Observable<T>;
  }

  post<T>(path: string, body: object = {}): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${path}`, body).pipe(catchError(this.formatErrors));
  }

  put<T>(path: string, body: object = {}): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}${path}`, body).pipe(catchError(this.formatErrors));
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}${path}`).pipe(catchError(this.formatErrors));
  }
}
