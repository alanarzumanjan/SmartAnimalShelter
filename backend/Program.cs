using System.Text;
using Microsoft.EntityFrameworkCore;
using Data;
using Microsoft.OpenApi;

Console.OutputEncoding = Encoding.UTF8;

var builder = WebApplication.CreateBuilder(args);

var connectionString = DbConnectionService.TestDatabaseConnection();

// EF Core + PostgreSQL
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// Connect Swagger
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Smart Animal Shelter API", Version = "v1" });
});

builder.Services.AddControllers();
builder.Services.AddHealthChecks();

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

var app = builder.Build();

// Apply database migrations automatically on startup if needed
using (var scope = app.Services.CreateScope())
{
    try
    {
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        
        // Check if there are pending migrations
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
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ Migration failed: {ex.Message}");
        throw;
    }
}

// Connect Swagger UI in Development
app.UseMiddleware<SwaggerAuth>();
app.UseSwagger();
app.UseSwaggerUI();

// CORS
app.UseCors(policy => policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
app.UseCors("FrontendOnly");

var port = Environment.GetEnvironmentVariable("PORT") ?? "5000";
app.UseStaticFiles();
app.MapHealthChecks("/health");
app.MapControllers();

AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

app.Run($"http://0.0.0.0:{port}");
