using System.Text;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Data;
using Services;
using ImageFetchers;
using Config;
using Models;
using MongoDB.Driver;
using DotNetEnv;

Console.OutputEncoding = Encoding.UTF8;

// Load .env file
var solutionRoot = Directory.GetParent(Directory.GetCurrentDirectory())!.FullName;
Env.Load(Path.Combine(solutionRoot, ".env"));
Console.WriteLine("✅ .env loaded from: " + Path.Combine(solutionRoot, ".env"));

var builder = WebApplication.CreateBuilder(args);

// Get connection string
var connectionString = DbConnectionService.TestDatabaseConnection();

// EF Core + PostgreSQL
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// MongoDB
var mongoUri = Environment.GetEnvironmentVariable("MONGO_URI");
var mongoClient = new MongoClient(mongoUri);
var mongoDb = mongoClient.GetDatabase("PetShelterMedia");
builder.Services.AddSingleton<IMongoClient>(mongoClient);
builder.Services.AddSingleton(mongoDb);

// ✅ Swagger
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "Smart Animal Shelter API", Version = "v1" });
});

// JWT Authentication
builder.Services.AddSingleton<JwtService>();
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER"),
        ValidAudience = Environment.GetEnvironmentVariable("JWT_AUDIENCE"),
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(Environment.GetEnvironmentVariable("JWT_KEY")!)),
        RoleClaimType = ClaimTypes.Role,
        NameClaimType = ClaimTypes.NameIdentifier
    };
});

// Password Hasing
builder.Services.AddSingleton<PasswordHashingService>();

// Controllers
builder.Services.AddControllers();
builder.Services.AddHealthChecks();

// Pets Parsing
builder.Services.AddHostedService<PetImportBackgroundService>();
builder.Services.AddScoped<PetParser>();
builder.Services.AddScoped<BreedResolver>();
builder.Services.AddScoped<GenderResolver>();
builder.Services.AddSingleton<MongoService>();
builder.Services.AddHttpClient();
builder.Services.AddTransient<ImageFetcher>();

// CORS
var frontendOrigin = Environment.GetEnvironmentVariable("ALLOWED_FRONTEND_PORT") ?? "http://localhost:5173";
builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendOnly", policy =>
    {
        policy.WithOrigins(frontendOrigin)
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Logging off
builder.Logging.ClearProviders();

var app = builder.Build();

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

app.UseCors("FrontendOnly");

app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();

app.MapHealthChecks("/health");
app.MapControllers();

// PostgreSQL timestamp fix
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

// Run
var port = Environment.GetEnvironmentVariable("PORT") ?? "5000";
app.Run($"http://0.0.0.0:{port}");