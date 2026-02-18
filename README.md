# ☁️ Distributed Cloud Storage & Sync Platform

A scalable, distributed cloud storage and synchronization platform built with **.NET 9** and **Angular 21**, following **Clean Architecture** principles. Designed to handle large files (up to 50 GB), support offline operations, and provide real-time synchronization.

---

## ✨ Features

- **Chunked Uploads** — Files are split into 5 MB chunks with SHA-256 hashing for integrity
- **Deduplication** — Identical chunks are stored once and reference-counted
- **Resumable Transfers** — Uploads can be paused, resumed, and track per-chunk progress
- **JWT Authentication** — Secure access with refresh token rotation and BCrypt password hashing
- **Permission System** — Owner-based file access with Read / Write / Owner granularity
- **Health Monitoring** — Liveness and readiness endpoints with database connectivity checks
- **Containerized** — Full Docker Compose setup for API, frontend, PostgreSQL, and Redis
- **Comprehensive Tests** — Unit tests across all 4 backend layers + frontend with Vitest

---

## 🏗️ Architecture

This project follows **Clean Architecture** with strict layer separation:

```
┌─────────────────────────────────────────────────────────────────┐
│                         API Layer                               │
│   Controllers · Swagger · JWT Middleware · CORS                 │
├─────────────────────────────────────────────────────────────────┤
│                      Application Layer                          │
│   Service Interfaces · DTOs · Business Contracts                │
├─────────────────────────────────────────────────────────────────┤
│                    Infrastructure Layer                          │
│   EF Core DbContext · Repositories · Services · Migrations      │
├─────────────────────────────────────────────────────────────────┤
│                       Domain Layer                              │
│   Entities · Enums · Repository Interfaces (zero dependencies)  │
└─────────────────────────────────────────────────────────────────┘
```

> 📖 Full documentation: [**Architecture**](docs/ARCHITECTURE.md) &nbsp;|&nbsp; [**Design**](docs/DESIGN.md)

---

## 🛠️ Tech Stack

| Layer              | Technology                            |
| ------------------ | ------------------------------------- |
| **Backend**        | .NET 9 Web API (C#)                   |
| **Frontend**       | Angular 21 (TypeScript, Standalone)   |
| **Database**       | PostgreSQL 16 (EF Core)               |
| **Cache**          | Redis 7 (provisioned)                 |
| **Auth**           | JWT (HS256) + BCrypt                  |
| **Containers**     | Docker & Docker Compose               |
| **Backend Tests**  | xUnit + Moq                           |
| **Frontend Tests** | Vitest 4 + jsdom                      |

---

## 📂 Project Structure

```
cloud-storage/
├── CloudStorage.API/                    # Entry point & controllers
│   ├── Controllers/
│   │   ├── AuthController.cs            #   Registration, login, token refresh
│   │   ├── FilesController.cs           #   File CRUD & permissions
│   │   ├── ChunkUploadController.cs     #   Chunked upload workflow
│   │   └── HealthController.cs          #   Liveness & readiness probes
│   ├── Program.cs                       #   DI, middleware, pipeline config
│   ├── Dockerfile                       #   Multi-stage .NET build
│   └── appsettings.json                 #   Configuration (JWT, DB, CORS)
│
├── CloudStorage.Application/            # Business contracts
│   ├── DTOs/                            #   UserDtos, FileDtos, ChunkUploadDtos
│   └── Interfaces/                      #   IAuthService, IFileService, etc.
│
├── CloudStorage.Domain/                 # Core entities (zero dependencies)
│   ├── Entities/                        #   User, FileMetadata, FileChunk, etc.
│   └── Interfaces/                      #   IRepository<T>, IUserRepository, etc.
│
├── CloudStorage.Infrastructure/         # Implementations
│   ├── Data/ApplicationDbContext.cs      #   EF Core with Fluent API
│   ├── Repositories/                    #   Generic & specialized repos
│   ├── Services/                        #   Auth, File, Chunk, Dedup, Token
│   └── Migrations/                      #   3 EF Core migrations
│
├── CloudStorage.Client/                 # Angular 21 frontend
│   ├── src/app/
│   │   ├── services/                    #   Chunking, Upload, UploadManager
│   │   └── components/                  #   FileUpload, UploadProgress
│   ├── Dockerfile                       #   Node 22 → Nginx SPA
│   └── nginx.conf                       #   SPA routing config
│
├── tests/                               # Backend test projects
│   ├── CloudStorage.Domain.Tests/       #   Entity & relationship tests
│   ├── CloudStorage.Application.Tests/  #   Service logic tests
│   ├── CloudStorage.Infrastructure.Tests/ # Repository & service tests
│   └── CloudStorage.API.Tests/          #   Controller tests
│
├── docs/                                # Documentation
│   ├── ARCHITECTURE.md                  #   System architecture reference
│   └── DESIGN.md                        #   Design decisions & patterns
│
├── docker-compose.yml                   #   Full orchestration
├── masterplan.md                        #   Project roadmap & phases
└── CloudStorage.sln                     #   .NET solution file
```

---

## 🏁 Getting Started

### Prerequisites

- [.NET 9 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)
- [Node.js 22+](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop)

### Option 1: Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/yourusername/cloud-storage.git
cd cloud-storage

# Start all services
docker-compose up --build
```

| Service    | URL                                  |
| ---------- | ------------------------------------ |
| API        | http://localhost:5000                 |
| Swagger    | http://localhost:5000/swagger         |
| Frontend   | http://localhost:4200                 |
| PostgreSQL | localhost:5432                        |
| Redis      | localhost:6379                        |

### Option 2: Manual Setup

```bash
# 1. Start PostgreSQL (ensure it's running on port 5432)
#    Update connection string in CloudStorage.API/appsettings.json if needed

# 2. Apply database migrations
dotnet ef database update --project CloudStorage.Infrastructure --startup-project CloudStorage.API

# 3. Run the API
dotnet run --project CloudStorage.API

# 4. Run the Angular client (in a separate terminal)
cd CloudStorage.Client
npm install
npm start
```

---

## 🔌 API Reference

### Authentication

| Endpoint                       | Method | Auth | Description                    |
| ------------------------------ | ------ | ---- | ------------------------------ |
| `POST /api/auth/register`      | POST   | No   | Create a new user account      |
| `POST /api/auth/login`         | POST   | No   | Login and receive JWT tokens   |
| `POST /api/auth/refresh`       | POST   | No   | Refresh expired access token   |
| `POST /api/auth/logout`        | POST   | Yes  | Revoke refresh token           |

### File Management

| Endpoint                        | Method | Auth | Description                    |
| ------------------------------- | ------ | ---- | ------------------------------ |
| `GET /api/files`                | GET    | Yes  | List user's files              |
| `GET /api/files/{id}`           | GET    | Yes  | Get file details               |
| `POST /api/files`               | POST   | Yes  | Create file metadata           |
| `DELETE /api/files/{id}`        | DELETE | Yes  | Soft delete a file             |
| `POST /api/files/{id}/permissions` | POST | Yes | Grant file permissions        |

### Chunked Upload

| Endpoint                             | Method | Auth | Description                 |
| ------------------------------------ | ------ | ---- | --------------------------- |
| `POST /api/files/initiate`           | POST   | Yes  | Start upload session        |
| `POST /api/files/chunks`             | POST   | Yes  | Upload a single chunk       |
| `POST /api/files/complete`           | POST   | Yes  | Finalize upload             |
| `GET /api/files/session/{id}/status` | GET    | Yes  | Check upload progress       |

### Health

| Endpoint        | Method | Auth | Description                        |
| --------------- | ------ | ---- | ---------------------------------- |
| `GET /health`   | GET    | No   | Liveness check                     |
| `GET /health/ready` | GET | No  | Readiness check (DB connectivity)  |

---

## 🧪 Testing

### Backend Tests

```bash
# Run all backend tests
dotnet test

# Run a specific test project
dotnet test tests/CloudStorage.Domain.Tests
dotnet test tests/CloudStorage.Application.Tests
dotnet test tests/CloudStorage.Infrastructure.Tests
dotnet test tests/CloudStorage.API.Tests
```

### Frontend Tests

```bash
cd CloudStorage.Client
npm test
```

**Test Coverage:**
- **Domain:** Entity validations, default values, relationships, cascade behavior
- **Application:** Service method logic with mocked dependencies
- **Infrastructure:** Repository queries, service integration with in-memory DB
- **API:** Controller response codes, authorization, input validation
- **Frontend:** Service logic, component behavior (Vitest + jsdom)

---

## 📚 Documentation

| Document                               | Description                                    |
| -------------------------------------- | ---------------------------------------------- |
| [Architecture](docs/ARCHITECTURE.md)   | System overview, layer details, data flows      |
| [Design](docs/DESIGN.md)              | Design patterns, schema, API design, future plans |
| [CI/CD](docs/CI-CD.md)                 | Pipeline architecture, secrets, deployment guide |
| [Masterplan](masterplan.md)            | Project roadmap, phases, and objectives         |

---

## 🗺️ Roadmap

- [x] **Phase 1:** MVP — Backend API, PostgreSQL, Docker setup
- [x] **Phase 2:** Database refinement, JWT auth, file management
- [x] **Phase 3:** Chunked uploads with deduplication
- [ ] **Phase 4:** Real-time sync with SignalR
- [ ] **Phase 5:** Azure Blob Storage integration
- [ ] **Phase 6:** Offline-first mode with conflict resolution
- [ ] **Phase 7:** Client-side encryption & advanced security

---

## 🤝 Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
