import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, retryWhen, mergeMap } from 'rxjs/operators';
import { FileChunk } from './chunking.service';

export interface UploadSession {
  fileId: string;
  sessionId: string;
  uploadUrl: string;
}

export interface ChunkUploadResponse {
  chunkId: string;
  status: string;
  isDuplicate: boolean;
  message?: string;
}

export interface UploadStatusResponse {
  sessionId: string;
  uploadedChunks: number[];
  totalChunks: number;
  status: string;
  message?: string;
}

export interface CompleteUploadResponse {
  fileId: string;
  status: string;
  metadata: {
    fileName: string;
    size: number;
    chunkCount: number;
    contentType: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class UploadService {
  private http = inject(HttpClient);
  private readonly apiUrl = '/api/files';
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second

  /**
   * Initiates an upload session
   * @param fileName Name of the file
   * @param fileSize Size in bytes
   * @param totalChunks Number of chunks
   * @param contentType MIME type
   * @returns Observable of upload session
   */
  initiateUpload(
    fileName: string,
    fileSize: number,
    totalChunks: number,
    contentType: string
  ): Observable<UploadSession> {
    const payload = {
      fileName,
      fileSize,
      totalChunks,
      contentType
    };

    return this.http.post<UploadSession>(`${this.apiUrl}/initiate`, payload)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Uploads a single chunk with retry logic
   * @param sessionId Upload session ID
   * @param chunk The chunk to upload
   * @returns Observable of chunk upload response
   */
  uploadChunk(sessionId: string, chunk: FileChunk): Observable<ChunkUploadResponse> {
    const formData = new FormData();
    formData.append('chunk', chunk.data, `chunk-${chunk.index}`);
    formData.append('sessionId', sessionId);
    formData.append('chunkIndex', chunk.index.toString());
    formData.append('hash', chunk.hash);

    return this.http.post<ChunkUploadResponse>(`${this.apiUrl}/chunks`, formData)
      .pipe(
        retryWhen(errors =>
          errors.pipe(
            mergeMap((error, index) => {
              // Retry up to maxRetries times with exponential backoff
              if (index < this.maxRetries) {
                const delay = this.retryDelay * Math.pow(2, index);
                console.log(`Retrying chunk ${chunk.index} upload (attempt ${index + 1}/${this.maxRetries}) after ${delay}ms`);
                return timer(delay);
              }
              return throwError(() => error);
            })
          )
        ),
        catchError(this.handleError)
      );
  }

  /**
   * Completes the upload session
   * @param sessionId Upload session ID
   * @returns Observable of complete upload response
   */
  completeUpload(sessionId: string): Observable<CompleteUploadResponse> {
    return this.http.post<CompleteUploadResponse>(`${this.apiUrl}/complete`, { sessionId })
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Gets the status of an upload session (for resume)
   * @param sessionId Upload session ID
   * @returns Observable of upload status
   */
  resumeUpload(sessionId: string): Observable<UploadStatusResponse> {
    return this.http.get<UploadStatusResponse>(`${this.apiUrl}/session/${sessionId}/status`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Uploads multiple chunks with concurrency limit
   * @param sessionId Upload session ID
   * @param chunks Array of chunks to upload
   * @param maxConcurrent Maximum concurrent uploads (default: 3)
   * @param progressCallback Callback for progress updates
   * @returns Promise resolving when all chunks are uploaded
   */
  async uploadChunksWithConcurrency(
    sessionId: string,
    chunks: FileChunk[],
    maxConcurrent = 3,
    progressCallback?: (uploaded: number, total: number) => void
  ): Promise<void> {
    let uploadedCount = 0;
    const total = chunks.length;
    const executing: Promise<void>[] = [];

    for (const chunk of chunks) {
      const p = this.uploadChunk(sessionId, chunk).toPromise()
        .then(() => {
          uploadedCount++;
          if (progressCallback) {
            progressCallback(uploadedCount, total);
          }
        })
        .finally(() => {
          const index = executing.indexOf(p);
          if (index > -1) {
            executing.splice(index, 1);
          }
        });

      executing.push(p);

      if (executing.length >= maxConcurrent) {
        await Promise.race(executing);
      }
    }

    await Promise.all(executing);
  }

  /**
   * Error handler
   */
  private handleError(error: HttpErrorResponse | Error): Observable<never> {
    let errorMessage = 'An error occurred';

    if (error instanceof HttpErrorResponse) {
        if (error.error instanceof ErrorEvent) {
            // Client-side error
            errorMessage = `Error: ${error.error.message}`;
        } else {
            // Server-side error
            errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
            if (error.error?.message) {
                errorMessage = error.error.message;
            }
        }
    } else {
        errorMessage = error.message;
    }

    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
