FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
USER root
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /app/storage/chunks && chown -R app:app /app/storage
USER app
WORKDIR /app
EXPOSE 8080
EXPOSE 8081
ENV ASPNETCORE_URLS="http://+:8080"

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["CloudStorage.API/CloudStorage.API.csproj", "CloudStorage.API/"]
COPY ["CloudStorage.Application/CloudStorage.Application.csproj", "CloudStorage.Application/"]
COPY ["CloudStorage.Domain/CloudStorage.Domain.csproj", "CloudStorage.Domain/"]
COPY ["CloudStorage.Infrastructure/CloudStorage.Infrastructure.csproj", "CloudStorage.Infrastructure/"]
RUN dotnet restore "./CloudStorage.API/CloudStorage.API.csproj"
COPY . .
WORKDIR "/src/CloudStorage.API"
RUN dotnet build "./CloudStorage.API.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "./CloudStorage.API.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "CloudStorage.API.dll"]
