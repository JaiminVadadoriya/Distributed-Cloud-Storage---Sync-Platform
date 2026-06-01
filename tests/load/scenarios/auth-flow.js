import http from 'k6/http';
import { check, sleep } from 'k6';
import { options as sharedOptions, BASE_URL } from '../k6-config.js';

export const options = sharedOptions;
options.scenarios.contacts.stages = [
  { duration: '1m', target: 500 },
  { duration: '3m', target: 2000 },
  { duration: '1m', target: 0 },
];

export default function () {
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: 'testuser@example.com',
    password: 'Password123!',
    deviceId: 'k6-load-tester'
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(loginRes, {
    'login status is 200': (r) => r.status === 200,
    'has token': (r) => r.json('token') !== undefined,
  });

  sleep(Math.random() * 3 + 1); // User think time 1-4s
}
