import { Injectable, signal } from '@angular/core';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';
import { from, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FfmpegService {
  private ffmpeg = new FFmpeg();
  private isLoaded = false;
  
  public isProcessing = signal<boolean>(false);
  public progress = signal<number>(0);

  /**
   * Initializes the FFmpeg WASM core. 
   * Loads from unpkg CDN for simplicity, but can be configured for local assets.
   */
  async load(): Promise<void> {
    if (this.isLoaded) return;

    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    
    // Listen to progress events
    this.ffmpeg.on('progress', ({ progress }) => {
      this.progress.set(Math.round(progress * 100));
    });

    await this.ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    this.isLoaded = true;
  }

  /**
   * Transcodes an input video blob to a web-safe MP4 format.
   * @param inputBlob The raw input video data.
   * @param inputName The original filename to determine the format.
   * @returns An Observable that emits the transcoded MP4 Blob.
   */
  transcode(inputBlob: Blob, inputName: string): Observable<Blob> {
    return from(this.runTranscode(inputBlob, inputName));
  }

  private async runTranscode(inputBlob: Blob, inputName: string): Promise<Blob> {
    try {
      this.isProcessing.set(true);
      this.progress.set(0);
      
      await this.load();

      // Write the file to the virtual filesystem
      await this.ffmpeg.writeFile(inputName, await fetchFile(inputBlob));

      // Execute the transcode command
      // -i: input file
      // -c:v libx264: video codec
      // -preset ultrafast: fastest encoding speed (for preview)
      // -f mp4: output format
      await this.ffmpeg.exec(['-i', inputName, '-c:v', 'libx264', '-preset', 'ultrafast', 'output.mp4']);

      // Read the result
      const data = await this.ffmpeg.readFile('output.mp4');
      
      // Cleanup the virtual filesystem
      await this.ffmpeg.deleteFile(inputName);
      await this.ffmpeg.deleteFile('output.mp4');

      // Use unknown -> BlobPart cast to handle SharedArrayBuffer compatibility 
      // which vary between TS versions for the Blob constructor.
      return new Blob([data as unknown as BlobPart], { type: 'video/mp4' });
    } catch (error) {
      console.error('[FfmpegService] Transcoding failed:', error);
      throw error;
    } finally {
      this.isProcessing.set(false);
    }
  }
}
