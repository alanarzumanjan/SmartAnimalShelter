using System.Text;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Data;
using Services;
using Services.Redis;
using ImageFetchers;
using Config;
using MongoDB.Driver;
using DotNetEnv;
using Services.Payments;
using Hubs;
using StackExchange.Redis;

Console.OutputEncoding = Encoding.UTF8;

// Load .env file
var solutionRoot = Directory.GetParent(Directory.GetCurrentDirectory())!.FullName;
Env.Load(Path.Combine(solutionRoot, ".env"));
Console.WriteLine("✅ .env loaded from: " + Path.Combine(solutionRoot, ".env"));

var builder = WebApplication.CreateBuilder(args);
var jwtSettings = JwtSettings.FromConfiguration(builder.Configuration);

// Get connection string
var connectionString = DbConnectionService.TestDatabaseConnection();

// EF Core + PostgreSQL
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// MongoDB
var mongoUri = Environment.GetEnvironmentVariable("MONGO_URI")
               ?? Environment.GetEnvironmentVariable("MONGODB_CONNECTION_STRING")
               ?? "mongodb://localhost:27017";
Console.WriteLine($"🔗 MongoDB URI: {mongoUri}");

var mongoClient = new MongoClient(mongoUri);
var mongoDb = mongoClient.GetDatabase("PetShelterMedia");
builder.Services.AddSingleton<IMongoClient>(mongoClient);
builder.Services.AddSingleton<IMongoDatabase>(mongoDb);

// Swagger
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "Smart Animal Shelter API", Version = "v1" });
});

// JWT Authentication
builder.Services.AddSingleton(jwtSettings);
builder.Services.AddSingleton<JwtService>();
builder.Services.AddSingleton(StripeCheckoutOptions.FromConfiguration(builder.Configuration));
builder.Services.AddSingleton<StripeCheckoutService>();
builder.Services.AddScoped<OrderService>();
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = builder.Environment.IsProduction();
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = ctx =>
        {
            var token = ctx.Request.Query["access_token"];
            if (!string.IsNullOrEmpty(token) && ctx.HttpContext.Request.Path.StartsWithSegments("/chatHub"))
                ctx.Token = token;
            return Task.CompletedTask;
        }
    };
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = !string.IsNullOrWhiteSpace(jwtSettings.Issuer),
        ValidateAudience = !string.IsNullOrWhiteSpace(jwtSettings.Audience),
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings.Issuer,
        ValidAudience = jwtSettings.Audience,
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(jwtSettings.Key)),
        RoleClaimType = ClaimTypes.Role,
        NameClaimType = ClaimTypes.NameIdentifier
    };
});

// Password Hasing
builder.Services.AddSingleton<PasswordHashingService>();
builder.Services.AddScoped<UserEmailService>();

// Redis
var redisConnectionString = Environment.GetEnvironmentVariable("REDIS_CONNECTION_STRING") ?? "localhost:6379";
var redisMultiplexer = ConnectionMultiplexer.Connect(redisConnectionString);
builder.Services.AddSingleton<IConnectionMultiplexer>(redisMultiplexer);
builder.Services.AddSingleton<RedisService>();

// Controllers
builder.Services.AddControllers();
builder.Services.AddSignalR()
    .AddStackExchangeRedis(redisConnectionString);
builder.Services.AddHealthChecks();

// Pets
builder.Services.AddScoped<BreedResolver>();
builder.Services.AddScoped<GenderResolver>();
builder.Services.AddSingleton<MongoService>();
builder.Services.AddHttpClient();
builder.Services.AddTransient<ImageFetcher>();
builder.Services.AddScoped<UserEmailService>();

// CORS
var frontendOrigin = Environment.GetEnvironmentVariable("ALLOWED_FRONTEND_PORT") ?? "http://localhost:5173";
builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendOnly", policy =>
    {
        policy.WithOrigins(frontendOrigin)
              .WithMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

// Structured logging
builder.Logging.AddConsole();
builder.Logging.AddDebug();
builder.Logging.SetMinimumLevel(LogLevel.Information);

var app = builder.Build();

app.UseCors("FrontendOnly");

// Auto migrate and seed species
using (var scope = app.Services.CreateScope())
{
    try
    {
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var pendingMigrations = await dbContext.Database.GetPendingMigrationsAsync();

        if (pendingMigrations.Any())
        {
            Console.WriteLine($"📦 Found {pendingMigrations.Count()} pending migration(s). Applying...");
            foreach (var migration in pendingMigrations)
            {
                Console.WriteLine($"   - {migration}");
            }

            await dbContext.Database.MigrateAsync();
            Console.WriteLine("✅ Database migrations applied successfully");
        }
        else
        {
            Console.WriteLine("✅ Database is up to date. No migrations needed.");
        }

        await DbInitializer.EnsureDbIsInitializedAsync(dbContext);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ Migration failed: {ex.Message}");
        throw;
    }
}

// Middleware Pipeline
app.UseMiddleware<SwaggerAuth>();
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Smart Animal Shelter API v1");
});

app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();

app.MapHealthChecks("/health");
app.MapControllers();
app.MapHub<ChatHub>("/chatHub");

// PostgreSQL timestamp fix
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

// Run
var port = Environment.GetEnvironmentVariable("PORT") ?? "5000";
app.Run($"http://0.0.0.0:{port}");
