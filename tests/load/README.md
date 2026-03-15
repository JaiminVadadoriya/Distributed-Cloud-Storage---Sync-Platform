# Load Testing with k6

This directory contains k6 scripts designed to stress-test the Distributed Cloud Storage Platform to handle ~12,000 concurrent users.

## Prerequisites
- [Install k6](https://k6.io/docs/get-started/installation/)
- A running instance of the stack (`docker-compose up -d`)

## Running the Tests

You can run individual scenarios to isolate behaviors, or run the mixed workload to simulate real-world traffic.

### 1. Authentication Flow (2k VUs)
Tests the login endpoint and token generation capabilities.
```bash
k6 run scenarios/auth-flow.js
```

### 2. File Upload Flow (500 VUs)
Simulates chunked file uploads, generating temporary files and dispatching tasks to RabbitMQ.
```bash
k6 run scenarios/file-upload.js
```

### 3. File Listing Flow (5k VUs)
Simulates a read-heavy workload where users continuously fetch their file lists and application dashboard stats. Hits the Redis cache.
```bash
k6 run scenarios/file-listing.js
```

### 4. Mixed Workload (12k VUs)
Simulates the peak production load with 60% reads, 30% uploads, and 10% auth flows.
```bash
k6 run scenarios/mixed-workload.js
```

## Dashboard Monitoring
While running the tests, be sure to open Grafana (`http://localhost:3000`) to visualize the API request metrics aggregated by Prometheus.
