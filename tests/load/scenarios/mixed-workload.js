import { options as sharedOptions } from '../k6-config.js';
import loadAuth from './auth-flow.js';
import loadUpload from './file-upload.js';
import loadListing from './file-listing.js';

export const options = {
  discardResponseBodies: false,
  scenarios: {
    auth_scenario: {
      executor: 'ramping-vus',
      exec: 'authFlow',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 1200 },
        { duration: '5m', target: 1200 },
        { duration: '2m', target: 0 },
      ],
    },
    listing_scenario: {
      executor: 'ramping-vus',
      exec: 'listingFlow',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 7200 },
        { duration: '5m', target: 7200 },
        { duration: '2m', target: 0 },
      ],
    },
    upload_scenario: {
      executor: 'ramping-vus',
      exec: 'uploadFlow',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 3600 },
        { duration: '5m', target: 3600 },
        { duration: '2m', target: 0 },
      ],
    }
  },
  thresholds: sharedOptions.thresholds,
};

export function authFlow() {
  loadAuth();
}

export function listingFlow() {
  loadListing();
}

export function uploadFlow() {
  loadUpload();
}
