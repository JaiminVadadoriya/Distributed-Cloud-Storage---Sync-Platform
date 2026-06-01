import http from 'k6/http';
import { check, sleep } from 'k6';
import { options as sharedOptions, BASE_URL } from '../k6-config.js';

export const options = sharedOptions;
options.scenarios.contacts.stages = [
  { duration: '2m', target: 2000 },
  { duration: '5m', target: 5000 },
  { duration: '2m', target: 0 },
];

export default function () {
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: 'testuser@example.com',
    password: 'Password123!',
    deviceId: 'k6-load-tester'
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  if (!check(loginRes, { 'login success': (r) => r.status === 200 })) return;
  const token = loginRes.json('token');

  // List files
  const filesRes = http.get(`${BASE_URL}/api/files`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  check(filesRes, { 'files listed': (r) => r.status === 200 });
  
  // Get Dashboard Stats
  const statsRes = http.get(`${BASE_URL}/api/files/stats`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  check(statsRes, { 'stats fetched': (r) => r.status === 200 });

  sleep(Math.random() * 2 + 1);
}
