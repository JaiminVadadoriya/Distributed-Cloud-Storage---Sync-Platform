import http from 'k6/http';
import { check, sleep } from 'k6';
import { options as sharedOptions, BASE_URL } from '../k6-config.js';

export const options = sharedOptions;
options.scenarios.contacts.stages = [
  { duration: '1m', target: 100 },
  { duration: '3m', target: 500 },
  { duration: '1m', target: 0 },
];

// Read a small 1KB chunk of test data into memory
const chunkData = new ArrayBuffer(1024);

export default function () {
  // 1. Login to get token
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: 'testuser@example.com',
    password: 'Password123!',
    deviceId: 'k6-load-tester'
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  if (!check(loginRes, {
    'login success': (r) => r.status === 200,
  })) {
    return;
  }

  const token = loginRes.json('token');
  const headers = { Authorization: `Bearer ${token}` };

  // 2. Initiate upload
  const initRes = http.post(`${BASE_URL}/api/files/initiate`, JSON.stringify({
    fileName: `test-upload-${__VU}-${__ITER}.bin`,
    contentType: 'application/octet-stream',
    fileSize: 1024,
    totalChunks: 1
  }), {
    headers: Object.assign({}, headers, { 'Content-Type': 'application/json' })
  });

  if (!check(initRes, { 'init success': (r) => r.status === 200 })) {
    return;
  }

  const sessionId = initRes.json('sessionId');

  // 3. Upload chunk
  const fd = new FormData();
  fd.append('SessionId', sessionId);
  fd.append('ChunkIndex', 0);
  fd.append('Hash', 'dummyhash123');
  fd.append('Chunk', http.file(chunkData, 'chunk.bin', 'application/octet-stream'));

  const chunkRes = http.post(`${BASE_URL}/api/files/chunks`, fd.body(), {
    headers: Object.assign({}, headers, { 'Content-Type': `multipart/form-data; boundary=${fd.boundary}` })
  });

  check(chunkRes, { 'chunk upload success': (r) => r.status === 200 });
  
  // 4. Complete upload
  const completeRes = http.post(`${BASE_URL}/api/files/complete`, JSON.stringify({
    sessionId: sessionId
  }), {
    headers: Object.assign({}, headers, { 'Content-Type': 'application/json' })
  });
  
  check(completeRes, { 'upload completed': (r) => r.status === 200 });

  sleep(Math.random() * 5 + 2); // Think time 2-7s
}
