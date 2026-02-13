# Distributed Cloud Storage

A scalable, distributed cloud storage and synchronization platform built with .NET Core, following Clean Architecture principles. designed to handle large files, support offline operations, and provide real-time synchronization.

## 🚀 Features

- **Large File Support**: Efficient handling of large files (up to 50GB) with chunked uploads.
- **Resumable Transfers**: Uploads and downloads can be paused and resumed.
- **Offline-First**: robust offline mode with conflict resolution and versioning.
- **Real-Time Sync**: Instant updates across devices using SignalR.
- **Secure**: End-to-end encryption support and secure JWT authentication.
- **Scalable**: Dockerized microservices architecture ready for cloud deployment.

## 🛠️ Tech Stack

- **Backend**: .NET 9 Web API
- **Architecture**: Clean Architecture (Domain, Application, Infrastructure, API)
- **Database**: PostgreSQL (Entity Framework Core)
- **Containerization**: Docker & Docker Compose
- **Authentication**: JWT (JSON Web Tokens)

## 📂 Project Structure

```
├── CloudStorage.API             # Entry point, Controllers, Configuration
├── CloudStorage.Application     # Business Logic, DTOs, Interfaces, CQRS (optional)
├── CloudStorage.Domain          # Enterprise Entities, Value Objects, Core Logic
├── CloudStorage.Infrastructure  # Data Access, External Services, Implementation
├── CloudStorage.Client          # Angular Frontend Application
├── tests                        # Unit and Integration Tests
└── docker-compose.yml           # Orchastration for API and Database
```

## 🏁 Getting Started

### Prerequisites

- [.NET 9 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)
- [Docker Desktop](https://www.docker.com/products/docker-desktop)

### Running Locally with Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/cloud-storage.git
   cd cloud-storage
   ```

2. **Start the services**
   ```bash
   docker-compose up --build
   ```
   This command starts the PostgreSQL database and the API.

3. **Access the API**
   - API is running at: `http://localhost:5000` (or configured port)
   - Swagger Documentation: `http://localhost:5000/swagger`

### Running Manually

1. **Start PostgreSQL**
   Ensure you have a PostgreSQL instance running. Update the connection string in `CloudStorage.API/appsettings.json`.

2. **Apply Migrations**
   ```bash
   dotnet ef database update --project CloudStorage.Infrastructure --startup-project CloudStorage.API
   ```

3. **Run the API**
   ```bash
   dotnet run --project CloudStorage.API
   ```

## 🧪 Testing

Run the test suite to ensure everything is working correctly:

```bash
dotnet test
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the project.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
