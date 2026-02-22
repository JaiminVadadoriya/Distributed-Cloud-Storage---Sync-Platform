# Project Final Report
**Project Title**: Distributed Cloud Storage Platform
**Term**: 2026 Spring

## 1. Executive Summary
The Distributed Cloud Storage Platform is a complete, scalable solution designed for robust file storage, chunked uploads, cross-device synchronization, and offline capability. Drawing inspiration from enterprise-level file hosting solutions, this project successfully leverages modern architectural patterns like Clean Architecture in the .NET backend and highly modular design in the Angular 21 frontend. A dedicated mobile frontend (CinePhone Pro) acts as an alternative client tailored to camera capabilities with native method channels bridging Flutter and Android SDKs.

## 2. Project Objectives
- **Scalability**: Deliver a system capable of managing large files without compromising performance or memory.
- **Reliability**: Implement chunked file uploads and resumable sessions to cope with interrupted networks.
- **Real-Time Sync**: Ensure immediate feedback on file updates natively across all connected devices using SignalR.
- **Security**: Apply industry-standard JWT authentication, HTTPS/HSTS, comprehensive CORS rules, and rate-limiting brute-force protections.

## 3. Architecture & Technologies
- **Backend**: Built with .NET 9 ASP.NET Core, employing Entity Framework Core to interface with an underlying PostgreSQL database. It heavily relies on the Clean Architecture paradigm (Domain / Application / Infrastructure / API).
- **Frontend**: Developed with Angular 21, adopting zoneless change detection and Tailwind CSS v4 to provide a premium, dynamic web interface.
- **Mobile Client**: Flutter application built for Android utilizing the Android Camera2 API via advanced native standard MethodChannels.
- **Cloud Storage**: Integration with Microsoft Azure Blob Storage for resilient, robust, off-premise chunk persistence via secure SAS tokens. 

## 4. Key Features Implemented
1. **Deduplication Engine**: Calculates SHA-256 hashes pre-upload to verify file existence and assign rapid, zero-byte uploads when exact copies exist.
2. **Chunked Uploads**: Circumvents memory limits parsing large files up to 5MB chunks client-side, uploading concurrently to Blob Storage.
3. **SignalR Push Notifications**: Disseminates UI-refresh events upon file mutation allowing for zero-refresh concurrent visibility.
4. **Zoneless Performance enhancements**: By eliminating `zone.js` in Angular, rendering overhead dramatically fell, speeding up heavy component interactions.
5. **Security Hardening**: Enforced security headers (`X-Content-Type-Options: nosniff`), rigid frame options, and rate limiters on endpoints. 

## 5. Testing & Validation
- **Unit Testing**: 100% test coverage across core uploading and synchronization Application layers on xUnit and Moq.
- **Load Testing**: Confirmed stability via k6 simulated user tests uploading high-throughput file increments.
- **Linting**: Achieved completely clean lint environments across both frontend (ESLint) and backend (Roslyn attributes).

## 6. Challenges & Resolutions
- **Large File Out-of-Memory handling**: Attempting to upload full files natively crashed both client and server limits. We solved this securely by engineering the session-based 5MB chunk split procedure.
- **Real-time Mobile offline sync**: Synchronizing cached states back to the database after returning online proved hard, solved by introducing explicit Delta Sync endpoints logging local-time checkpoints.

## 7. Conclusion
The project successfully meets all academic and infrastructural requirements, producing a minimum viable product that borders on enterprise readiness due to its resilient chunked protocols, tight security boundaries, and modular microarchitecture foundations.
