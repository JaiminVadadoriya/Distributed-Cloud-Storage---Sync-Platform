import { APIRequestContext, request } from '@playwright/test';

export class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = process.env['API_BASE_URL'] || 'http://localhost:5010') {
    this.baseURL = baseURL;
  }

  async getAuthToken(username: string, password: string): Promise<string> {
    const apiRequest = await request.newContext();
    const response = await apiRequest.post(`${this.baseURL}/api/auth/login`, {
      data: { username, password }
    });
    
    if (!response.ok()) {
      throw new Error(`Failed to login: ${response.statusText()}`);
    }
    
    const body = await response.json();
    return body.token;
  }

  async resetData(): Promise<void> {
    // This assumes a test-only endpoint exists or we use direct DB access helper
    const apiRequest = await request.newContext();
    const response = await apiRequest.post(`${this.baseURL}/api/test/reset`);
    if (!response.ok()) {
        console.warn('⚠️ Test reset endpoint not found or failed. Ensure backend is in Test environment.');
    }
  }
}
