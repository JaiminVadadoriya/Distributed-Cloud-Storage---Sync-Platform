# Final Presentation Outline & Demo Script

## 1. Presentation Slides (PPT Outline)

### Slide 1: Title Slide
- **Title**: Distributed Cloud Storage Platform
- **Subtitle**: A scalable, secure, and cross-platform file synchronization engine.

### Slide 2: The Problem
- **Context**: File uploads in browsers often fail when exceeding system memory limits or network stability drops.
- **Challenge**: Traditional file upload scenarios struggle with resuming after a crash and handling simultaneous collaborative updates.

### Slide 3: Our Solution
- **Overview**: An end-to-end framework consisting of an ASP.NET Core 10 Clean Architecture backend, an Angular 21 web client, and a native Flutter mobile app with custom camera capabilities.
- **Key Features**: 
  - 5MB chunked resilient uploads to Azure Blob Storage
  - Fast SHA-256 Deduplication
  - SignalR real-time event pushing

### Slide 4: System Architecture
- *Visual*: Show the High-Level flow diagram from `SYSTEM_DIAGRAMS.md`.
- **Backend Flow**: Controllers -> Services -> EF Core -> PostgreSQL.
- **Cloud Interface**: Backend generating SAS tokens passing directly to blob endpoints or acting as a relay.

### Slide 5: Real-Time Synchronization
- **Challenge**: Keeping multi-device clients immediately aware of a new file upload.
- **Solution**: The backend pushes an event via WebSockets (SignalR) immediately upon finalizing chunk reconstruction. The client instantly fetches the delta.

### Slide 6: Security & Optimization
- **Security**: JWT bearer logic, HTTP Strict Transport Security, secure Content Security Policies, rate limits to prevent brute-forcing.
- **Performance**: Angular Migration to Zoneless rendering, backend optimized DTO layers, database Cascade limits.

### Slide 7: Conclusion
- **Summary**: Delivered a robust minimum viable enterprise product capable of handling concurrent, large-file sessions and maintaining a resilient state machine.

---

## 2. Project Demo Script

### Pre-Demo Checklist
1. Start PostgreSQL Database (`docker-compose up -d`)
2. Start the API backend (`cd CloudStorage.API && dotnet run`)
3. Start the Angular client (`cd CloudStorage.Client && npm run start`)
4. Open the web app on `http://localhost:4200`
5. Have two distinct browsers open (e.g., Chrome & Edge) to show real-time sync.

### Step 1: Authentication
- **Action**: Register a new user account.
- **Talking Point**: "We begin by registering a new account. Our backend hashes the password immediately and establishes a short-lived Access token with a rotating Refresh token."

### Step 2: Dashboard & First Upload
- **Action**: Log in. Navigate to the Dashboard. Unveil a fresh workspace.
- **Talking Point**: "Here is the Angular 21 zoneless dashboard. Notice the empty storage stats. We'll upload a large dummy file, over 10MB."

### Step 3: Resilient Chunked Upload
- **Action**: Select the large file and upload it.
- **Talking Point**: "Behind the scenes, the browser calculates the SHA-256 hash. Because the file is non-existent on the server, the backend authorizes a chunked session. You can see the progress bar tick up in increments of 5MB."

### Step 4: Real-Time Sync (SignalR)
- **Action**: Arrange the two browser windows side-by-side. Log in to the same account on the second browser. Upload a small image from Browser 1.
- **Talking Point**: "Without manually refreshing Browser 2, it instantly displays the newly uploaded image. This proves our SignalR Websocket hub immediately alerts connected clients of state mutations."

### Step 5: File Deletion & Stats Update
- **Action**: Delete a file. Go back to Dashboard.
- **Talking Point**: "Deleting the file soft-removes the chunks from the Blob storage immediately and issues an event to sync the dashboard statistics dynamically."

### Final Remarks
- "Thank you for watching the demo. The complete documentation and OpenAPI specification can be found directly within the Git repository."
