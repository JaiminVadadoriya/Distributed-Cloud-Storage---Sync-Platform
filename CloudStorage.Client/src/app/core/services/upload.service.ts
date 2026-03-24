import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timer, throwError } from 'rxjs';
import { catchError, mergeMap, retry } from 'rxjs/operators';
import { BaseService } from '../models/base-service';
import { 
  UploadSession, 
  ChunkUploadResponse, 
  CompleteUploadResponse, 
  UploadStatusResponse, 
  FileChunk 
} from '../models/upload.model';

/**
 * UploadService handles the low-level transmission protocol for chunked uploads.
 */
@Injectable({
  providedIn: 'root'
})
export class UploadService extends BaseService {
  private http = inject(HttpClient);
  private readonly endpoint = '/api/files';

  /**
   * Initializes a new upload session on the remote node.
   */
  public initiateUpload(name: string, size: number, chunks: number, type: string): Observable<UploadSession> {
    return this.http.post<UploadSession>(`${this.endpoint}/initiate`, { 
      fileName: name, fileSize: size, totalChunks: chunks, contentType: type 
    }).pipe(
      catchError(this.handleError<UploadSession>('INIT_UPLOAD'))
    );
  }

  /**
   * Transmits a single data chunk with automated retry logic and backoff.
   */
  public uploadChunk(sessionId: string, chunk: FileChunk): Observable<ChunkUploadResponse> {
    const form = new FormData();
    form.append('chunk', chunk.data, `chunk-${chunk.index}`);
    form.append('sessionId', sessionId);
    form.append('chunkIndex', chunk.index.toString());
    form.append('hash', chunk.hash);

    return this.http.post<ChunkUploadResponse>(`${this.endpoint}/chunks`, form).pipe(
      retry({
        count: 3,
        delay: (error, retryCount) => timer(Math.pow(2, retryCount) * 1000)
      }),
      catchError(this.handleError<ChunkUploadResponse>(`UPLOAD_CHUNK_${chunk.index}`))
    );
  }

  /**
   * Finalizes the upload session and commits the object to permanent storage.
   */
  public completeUpload(sessionId: string): Observable<CompleteUploadResponse> {
    return this.http.post<CompleteUploadResponse>(`${this.endpoint}/complete`, { sessionId }).pipe(
      catchError(this.handleError<CompleteUploadResponse>('COMPLETE_UPLOAD'))
    );
  }

  /**
   * Synchronizes with the remote node to identify missing segments for resumption.
   */
  public getStatus(sessionId: string): Observable<UploadStatusResponse> {
    return this.http.get<UploadStatusResponse>(`${this.endpoint}/session/${sessionId}/status`).pipe(
      catchError(this.handleError<UploadStatusResponse>('GET_UPLOAD_STATUS'))
    );
  }
}
