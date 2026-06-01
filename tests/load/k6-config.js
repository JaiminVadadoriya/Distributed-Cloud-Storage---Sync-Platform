export const options = {
  discardResponseBodies: false,
  scenarios: {
    contacts: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },  // Ramp up
        { duration: '1m', target: 50 },   // Steady state
        { duration: '30s', target: 0 },   // Ramp down
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% of requests < 500ms
    http_req_failed: ['rate<0.01'], // less than 1% errors
  },
};

export const BASE_URL = __ENV.BASE_URL || 'http://localhost';
