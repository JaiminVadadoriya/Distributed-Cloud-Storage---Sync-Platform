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
using CloudStorage.API.Services;
using CloudStorage.Domain.Entities;
using CloudStorage.API.Hubs;
using CloudStorage.API.Extensions;
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
builder.Services.AddProblemDetails();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddHttpContextAccessor();

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
builder.Services.AddSwaggerGen(opt =>
{
    opt.SwaggerDoc("v1", new Microsoft.OpenApi.OpenApiInfo { Title = "CloudStorage API", Version = "v1" });
    opt.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.OpenApiSecurityScheme
    {
        In = Microsoft.OpenApi.ParameterLocation.Header,
        Description = "Please enter token",
        Name = "Authorization",
        Type = Microsoft.OpenApi.SecuritySchemeType.Http,
        BearerFormat = "JWT",
        Scheme = "bearer"
    });
    opt.AddSecurityRequirement(doc => new Microsoft.OpenApi.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.OpenApiSecuritySchemeReference("Bearer"),
            new List<string>()
        }
    });
});

builder.Services.AddResponseCaching();

// Database configuration
// Using Npgsql connection pooling for high concurrency
var dbConnectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (!string.IsNullOrEmpty(dbConnectionString) && !dbConnectionString.Contains("Maximum Pool Size"))
{
    dbConnectionString += dbConnectionString.EndsWith(";") ? "" : ";";
    dbConnectionString += "Maximum Pool Size=100;Minimum Pool Size=10;Connection Idle Lifetime=300;";
}

if (!builder.Environment.IsEnvironment("Testing"))
{
    builder.Services.AddDbContext<ApplicationDbContext>(options =>
    {
        options.UseNpgsql(dbConnectionString, npgsqlOptions =>
        {
            npgsqlOptions.EnableRetryOnFailure(maxRetryCount: 3, maxRetryDelay: TimeSpan.FromSeconds(5), errorCodesToAdd: null);
        });
        // Suppress the warning about collections without setters which can block migrations in EF Core 10
        options.ConfigureWarnings(w => w.Ignore(new EventId(10103, "Microsoft.EntityFrameworkCore.Model.CollectionWithoutSetter")));
    });
}
else
{
    builder.Services.AddDbContext<ApplicationDbContext>(options =>
    {
        // For testing, the provider will be overridden in WebApplicationFactory, 
        // but we need to pre-configure warnings here as well if ApplyMigrations uses them.
        options.ConfigureWarnings(w => w.Ignore(RelationalEventId.PendingModelChangesWarning));
    });
}

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
builder.Services.AddSingleton<RabbitMqService>();
builder.Services.AddSingleton<IMessageQueue>(sp => sp.GetRequiredService<RabbitMqService>());
builder.Services.AddSingleton<IEventPublisher>(sp => sp.GetRequiredService<RabbitMqService>());
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

// Storage configuration
builder.Services.AddCloudStorage(builder.Configuration);
builder.Services.AddScoped<IDistributedLockService, RedisDistributedLockService>();

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
    .AddNpgSql(dbConnectionString!, name: "PostgreSQL", tags: new[] { "ready" })
    .AddRedis(redisConnectionString, name: "Redis", tags: new[] { "ready" })
    .AddUrlGroup(new Uri((builder.Configuration["StorageProvider:MinIO:Endpoint"] ?? "localhost:9000").Replace("minio:", "localhost:").Insert(0, "http://")), name: "MinIO", tags: new[] { "ready" })
    .AddCheck("RabbitMQ", ct =>
    {
        try
        {
            var factory = new RabbitMQ.Client.ConnectionFactory
            {
                HostName = builder.Configuration["RabbitMQ:HostName"] ?? "localhost",
                UserName = builder.Configuration["RabbitMQ:UserName"] ?? "guest",
                Password = builder.Configuration["RabbitMQ:Password"] ?? "guest"
            };
            using var connection = Task.Run(() => factory.CreateConnectionAsync(), ct).GetAwaiter().GetResult();
            return HealthCheckResult.Healthy();
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("RabbitMQ is unreachable", ex);
        }
    }, tags: new[] { "ready" });

// OpenTelemetry Configuration
var isTesting = builder.Environment.EnvironmentName == "Testing";
builder.Services.AddOpenTelemetry()
    .ConfigureResource(resource => resource
        .AddService(serviceName: "CloudStorage.API"))
    .WithTracing(tracing =>
    {
        tracing.AddAspNetCoreInstrumentation(options =>
        {
            options.Filter = httpContext => !httpContext.Request.Path.StartsWithSegments("/health");
        })
        .AddSource("CloudStorage.Storage")
        .AddEntityFrameworkCoreInstrumentation()
        .AddHttpClientInstrumentation();

        if (!isTesting)
        {
            tracing.AddRedisInstrumentation()
                   .AddOtlpExporter();
        }
    })
    .WithMetrics(metrics =>
    {
        metrics.AddAspNetCoreInstrumentation()
        .AddMeter("System.Net.Http")
        .AddMeter("System.Net.NameResolution")
        .AddMeter("CloudStorage.Storage")
        .AddRuntimeInstrumentation();

        if (!isTesting)
        {
            metrics.AddOtlpExporter();
        }
    })
    .WithLogging(logging =>
    {
        if (!isTesting)
        {
            logging.AddOtlpExporter();
        }
    });

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

app.UseExceptionHandler(exceptionHandlerApp =>
{
    exceptionHandlerApp.Run(async context =>
    {
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/json";
        
        var exceptionHandlerPathFeature = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerPathFeature>();
        var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
        
        logger.LogError(exceptionHandlerPathFeature?.Error, "Unhandled API Exception occurred");
        
        var errorResponse = new { success = false, message = "An unexpected error occurred. Please try again later." };
        await context.Response.WriteAsJsonAsync(errorResponse);
    });
});

// Configure the HTTP request pipeline

// Security headers middleware
app.Use(async (context, next) =>
{
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Append("X-Frame-Options", "DENY");
    context.Response.Headers.Append("X-XSS-Protection", "0");
    context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
    var csp = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws: wss:;";
    context.Response.Headers.Append("Content-Security-Policy", csp);
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

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "CloudStorage API V1");
    c.RoutePrefix = "swagger";
});

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
app.MapHealthChecks("/health/live", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = _ => false
});
app.MapHealthChecks("/health/ready", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
});
app.MapHealthChecks("/health", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
});

if (!app.Environment.IsEnvironment("Testing"))
{
    app.ApplyMigrations(); // Manual migration recommended for distributed setups

    // Seed test users if explicitly requested (useful for persona-based E2E tests against Real DB)
    if (app.Configuration["SEED_TEST_USERS"] == "true")
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        if (!db.Users.Any(u => u.Email == "admin@cloud.io"))
        {
            Console.WriteLine("Seeding Admin User for E2E Tests...");
            db.Users.Add(new User
            {
                Username = "admin",
                Email = "admin@cloud.io",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
                Role = "Admin",
                IsActive = true
            });
        }

        if (!db.Users.Any(u => u.Email == "user@test.com"))
        {
            Console.WriteLine("Seeding Standard User for E2E Tests...");
            db.Users.Add(new User
            {
                Username = "user",
                Email = "user@test.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("User123!"),
                Role = "User",
                IsActive = true
            });
        }

        db.SaveChanges();
    }
}

app.Run();
