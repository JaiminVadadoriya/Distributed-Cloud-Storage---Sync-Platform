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

export interface FileChunk {
  index: number;
  data: Blob;
  hash: string;
}
