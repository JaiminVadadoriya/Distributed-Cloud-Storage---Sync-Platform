import { Page } from '@playwright/test';

/**
 * Wrapper around HTTP API client for making requests to the CloudStorage backend
 * Handles authentication, error handling, and response parsing
 */
export class ApiClient {
  constructor(
    private page: Page,
    private apiBase: string
  ) {}

  /**
   * Sets the authentication token in localStorage
   */
  async setAuthToken(token: string): Promise<void> {
    await this.page.evaluate((token) => {
      localStorage.setItem('auth_token', token);
    }, token);
  }

  /**
   * Gets the stored authentication token
   */
  async getAuthToken(): Promise<string | null> {
    return await this.page.evaluate(() => {
      return localStorage.getItem('auth_token');
    });
  }

  /**
   * Clears authentication token from localStorage
   */
  async clearAuthToken(): Promise<void> {
    await this.page.evaluate(() => {
      localStorage.removeItem('auth_token');
    });
  }

  /**
   * Makes an authenticated API request
   */
  async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    endpoint: string,
    options?: { body?: Record<string, any>; headers?: Record<string, string> }
  ): Promise<{ status: number; data?: T; error?: string }> {
    const url = `${this.apiBase}${endpoint}`;
    const token = await this.getAuthToken();

    const requestInit: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options?.headers,
      },
    };

    if (options?.body) {
      requestInit.body = JSON.stringify(options.body);
    }

    const response = await this.page.evaluate<{ status: number; data: any }, { url: string; requestInit: any }>(
      async ({ url, requestInit }) => {
        const response = await fetch(url, requestInit);
        const text = await response.text();
        return {
          status: response.status,
          data: text ? JSON.parse(text) : null,
        };
      },
      { url, requestInit }
    );

    if (response.status >= 400) {
      return {
        status: response.status,
        error: response.data?.message || `HTTP ${response.status}`,
      };
    }

    return response as { status: number; data?: T; error?: string };
  }

  /**
   * POST /auth/register - Register new user
   */
  async registerUser(username: string, email: string, password: string) {
    return this.request('POST', '/api/auth/register', {
      body: { username, email, password },
    });
  }

  /**
   * POST /auth/login - Authenticate user
   */
  async login(username: string, password: string) {
    return this.request<{ token: string; refreshToken: string }>('POST', '/api/auth/login', {
      body: { username, password },
    });
  }

  /**
   * POST /auth/refresh - Refresh JWT token using refresh token
   */
  async refreshToken(refreshToken: string) {
    return this.request<{ token: string }>('POST', '/api/auth/refresh', {
      body: { refreshToken },
    });
  }

  /**
   * GET /api/files - List files in current directory
   */
  async listFiles(parentFolderId?: string) {
    const endpoint = parentFolderId
      ? `/api/files?parentFolderId=${parentFolderId}`
      : '/api/files';
    return this.request('GET', endpoint);
  }

  /**
   * POST /api/files/upload - Initiate file upload
   */
  async initiateFileUpload(fileName: string, fileSize: number, parentFolderId?: string) {
    return this.request<{ uploadSessionId: string }>('POST', '/api/files/upload', {
      body: { fileName, fileSize, parentFolderId },
    });
  }

  /**
   * POST /api/folders - Create new folder
   */
  async createFolder(name: string, parentFolderId?: string) {
    return this.request('POST', '/api/folders', {
      body: { name, parentFolderId },
    });
  }

  /**
   * GET /api/folders/{id} - Get folder details
   */
  async getFolder(folderId: string) {
    return this.request('GET', `/api/folders/${folderId}`);
  }

  /**
   * PATCH /api/files/{id}/rename - Rename file
   */
  async renameFile(fileId: string, newName: string) {
    return this.request('PATCH', `/api/files/${fileId}/rename`, {
      body: { newName },
    });
  }

  /**
   * DELETE /api/files/{id} - Delete file (soft delete to trash)
   */
  async deleteFile(fileId: string) {
    return this.request('DELETE', `/api/files/${fileId}`);
  }

  /**
   * GET /api/trash - Get trashed items
   */
  async getTrash() {
    return this.request('GET', '/api/trash');
  }

  /**
   * POST /api/trash/{id}/restore - Restore item from trash
   */
  async restoreFromTrash(itemId: string) {
    return this.request('POST', `/api/trash/${itemId}/restore`);
  }

  /**
   * GET /api/health - Check API health
   */
  async checkHealth() {
    return this.request('GET', '/api/health');
  }

  /**
   * GET /api/devices - List registered devices
   */
  async getDevices() {
    return this.request('GET', '/api/devices');
  }

  /**
   * POST /api/devices - Register new device
   */
  async registerDevice(deviceName: string, deviceType: string) {
    return this.request('POST', '/api/devices', {
      body: { deviceName, deviceType },
    });
  }

  /**
   * GET /api/search - Search for files and folders
   */
  async search(query: string) {
    return this.request('GET', `/api/search?q=${encodeURIComponent(query)}`);
  }
}

/**
 * Creates an ApiClient bound to a page
 */
export function createApiClient(page: Page, apiBase: string): ApiClient {
  return new ApiClient(page, apiBase);
}
