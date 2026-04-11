using System.Threading.RateLimiting;
using Azure.Storage.Blobs;
using CloudStorage.Application.Interfaces;
using CloudStorage.Domain.Interfaces;
using CloudStorage.Infrastructure.Data;
using CloudStorage.Infrastructure.Repositories;
using CloudStorage.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using CloudStorage.API.Extensions;
using CloudStorage.API.Hubs;
using CloudStorage.API.Services;
using StackExchange.Redis;
using Microsoft.AspNetCore.ResponseCompression;
using Prometheus;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using OpenTelemetry.Metrics;
using OpenTelemetry.Logs;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using OpenTelemetry.Instrumentation.EntityFrameworkCore;
using OpenTelemetry.Instrumentation.Http;

var builder = WebApplication.CreateBuilder(args);

Console.WriteLine("CloudStorage API System Starting... Version: 2.0-Scalable");


// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// Response compression
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
});

// Configure Kestrel for HTTP/2 support
builder.WebHost.ConfigureKestrel(serverOptions =>
{
    serverOptions.ConfigureEndpointDefaults(listenOptions =>
    {
        listenOptions.Protocols = Microsoft.AspNetCore.Server.Kestrel.Core.HttpProtocols.Http1AndHttp2;
    });
});

// Configure Swagger
builder.Services.AddSwaggerGen();

builder.Services.AddResponseCaching();

// Database configuration
// Using Npgsql connection pooling for high concurrency
var dbConnectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (!string.IsNullOrEmpty(dbConnectionString) && !dbConnectionString.Contains("Maximum Pool Size"))
{
    dbConnectionString += dbConnectionString.EndsWith(";") ? "" : ";";
    dbConnectionString += "Maximum Pool Size=100;Minimum Pool Size=10;Connection Idle Lifetime=300;";
}

builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    options.UseNpgsql(dbConnectionString, npgsqlOptions => 
    {
        npgsqlOptions.EnableRetryOnFailure(maxRetryCount: 3, maxRetryDelay: TimeSpan.FromSeconds(5), errorCodesToAdd: null);
    });
    // Suppress the warning about collections without setters which can block migrations in EF Core 10
    options.ConfigureWarnings(w => w.Ignore(new EventId(10103, "Microsoft.EntityFrameworkCore.Model.CollectionWithoutSetter")));
});

// Repository registration
builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IFileMetadataRepository, FileMetadataRepository>();
builder.Services.AddScoped<IFolderRepository, FolderRepository>();
builder.Services.AddScoped<IActivityLogRepository, ActivityLogRepository>();

// Service registration
builder.Services.AddScoped<IRefreshTokenService, RefreshTokenService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IFileService, FileService>();
builder.Services.AddScoped<IFolderService, FolderService>();
builder.Services.AddScoped<IActivityService, ActivityService>();
builder.Services.AddScoped<IDeviceService, DeviceService>();
builder.Services.AddScoped<IDeduplicationService, DeduplicationService>();
builder.Services.AddScoped<INotificationService, SignalRNotificationService>();
builder.Services.AddScoped<IDeltaSyncService, DeltaSyncService>();
builder.Services.AddScoped<IConflictDetectionService, ConflictDetectionService>();
builder.Services.AddScoped<IAdminService, AdminService>();
builder.Services.AddScoped<INotificationPersistenceService, NotificationPersistenceService>();

// Notification repository
builder.Services.AddScoped<CloudStorage.Domain.Interfaces.INotificationRepository, CloudStorage.Infrastructure.Repositories.NotificationRepository>();

// RabbitMQ and Background processing
builder.Services.AddSingleton<IMessageQueue, RabbitMqService>();
builder.Services.AddHostedService<BackgroundWorkerService>();

// Redis and Caching Configuration
var redisConnectionString = builder.Configuration["Redis:ConnectionString"] ?? "redis:6379";

builder.Services.AddSingleton<IConnectionMultiplexer>(sp => 
    ConnectionMultiplexer.Connect(redisConnectionString));

builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = redisConnectionString;
});

builder.Services.AddScoped<ICacheService, RedisCacheService>();

// SignalR with Redis Backplane
builder.Services.AddSignalR()
    .AddStackExchangeRedis(redisConnectionString);

// Storage & Azure configuration
var blobConnectionString = builder.Configuration["AzureBlob:ConnectionString"] 
    ?? "UseDevelopmentStorage=true";
builder.Services.AddSingleton(x => new BlobServiceClient(blobConnectionString));
builder.Services.AddScoped<IBlobSasService, BlobSasService>();
builder.Services.AddScoped<IAzureChunkVerificationService, AzureChunkVerificationService>();

// We are now explicitly using BlobChunkStorageService instead of the local ChunkStorageService
builder.Services.AddScoped<IChunkStorageService, BlobChunkStorageService>();

// JWT Authentication
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"] 
                ?? throw new InvalidOperationException("Jwt:Key is missing")))
    };

    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();

// CORS configuration
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() ?? new[] { "http://localhost:4200" })
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

// Health checks with specialized probes
builder.Services.AddHealthChecks()
    .AddNpgSql(dbConnectionString!, name: "PostgreSQL")
    .AddRedis(redisConnectionString, name: "Redis")
    .AddAzureBlobStorage(blobConnectionString, name: "Azure_Blob_Storage");

// OpenTelemetry Configuration
builder.Services.AddOpenTelemetry()
    .ConfigureResource(resource => resource
        .AddService(serviceName: "CloudStorage.API"))
    .WithTracing(tracing => tracing
        .AddAspNetCoreInstrumentation(options =>
        {
            options.Filter = httpContext => !httpContext.Request.Path.StartsWithSegments("/health");
        })
        .AddEntityFrameworkCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddOtlpExporter())
    .WithMetrics(metrics => metrics
        .AddAspNetCoreInstrumentation()
        .AddMeter("System.Net.Http")
        .AddMeter("System.Net.NameResolution")
        .AddRuntimeInstrumentation()
        .AddOtlpExporter());

// Rate limiting
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    // Global policy: 100 requests per 60 seconds per IP
    options.AddFixedWindowLimiter("global", opt =>
    {
        opt.PermitLimit = 100;
        opt.Window = TimeSpan.FromSeconds(60);
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 0;
    });

    // Auth policy: 30 requests per 60 seconds per IP (brute-force protection)
    options.AddFixedWindowLimiter("auth", opt =>
    {
        opt.PermitLimit = 30;
        opt.Window = TimeSpan.FromSeconds(60);
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 0;
    });

    // Upload policy: 200 requests per 60 seconds per IP
    options.AddFixedWindowLimiter("upload", opt =>
    {
        opt.PermitLimit = 200;
        opt.Window = TimeSpan.FromSeconds(60);
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 2;
    });

    options.OnRejected = async (context, cancellationToken) =>
    {
        context.HttpContext.Response.ContentType = "application/json";
        await context.HttpContext.Response.WriteAsJsonAsync(
            new { message = "Too many requests. Please try again later." },
            cancellationToken);
    };
});

var app = builder.Build();

// Configure the HTTP request pipeline

// Security headers middleware
app.Use(async (context, next) =>
{
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Append("X-Frame-Options", "DENY");
    context.Response.Headers.Append("X-XSS-Protection", "0");
    context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
    context.Response.Headers.Append("Content-Security-Policy", "default-src 'self'");
    context.Response.Headers.Append("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    await next();
});

// HSTS in non-development environments
if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
    app.UseHttpsRedirection();
}
app.UseCors();
app.UseResponseCompression();
app.UseResponseCaching();
app.UseRateLimiter();
app.UseMiddleware<CloudStorage.API.Services.UploadThrottlingMiddleware>();

// Enable Prometheus metrics
app.UseHttpMetrics();

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<FileStorageHub>("/hubs/storage");
app.MapMetrics(); // Exposes /metrics
app.MapHealthChecks("/health");

app.ApplyMigrations(); // Manual migration recommended for distributed setups

app.Run();
