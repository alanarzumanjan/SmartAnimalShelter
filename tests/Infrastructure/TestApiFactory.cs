using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using Config;
using Controllers;
using Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using Models;
using Services;
using Services.Redis;

namespace tests.Infrastructure;

public sealed class TestApiFactory : IAsyncDisposable
{
    private const string EncryptionKey = "MTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTI=";
    private readonly string _databaseName = $"tests-{Guid.NewGuid():N}";
    private WebApplication? _app;

    public JwtSettings JwtSettings { get; } = new(new string('k', 32), "TestIssuer", "TestAudience", 30, 7);
    public JwtService JwtService => _app!.Services.GetRequiredService<JwtService>();

    public async Task InitializeAsync()
    {
        Environment.SetEnvironmentVariable("ENCRYPTION_KEY", EncryptionKey);
        EncryptionService.Initialize(EncryptionKey);

        var builder = WebApplication.CreateBuilder(new WebApplicationOptions
        {
            EnvironmentName = Environments.Development
        });

        builder.WebHost.UseTestServer();
        builder.Services.AddLogging();
        builder.Services.AddSingleton(JwtSettings);
        builder.Services.AddSingleton<JwtService>();
        builder.Services.AddSingleton<PasswordHashingService>();
        builder.Services.AddScoped<UserEmailService>();
        builder.Services.AddScoped<ShelterService>();
        builder.Services.AddSingleton<IRedisService, FakeRedisService>();
        builder.Services.AddDbContext<AppDbContext>(options =>
            options.UseInMemoryDatabase(_databaseName)
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning)));

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
                ValidIssuer = JwtSettings.Issuer,
                ValidAudience = JwtSettings.Audience,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(JwtSettings.Key)),
                RoleClaimType = ClaimTypes.Role,
                NameClaimType = ClaimTypes.NameIdentifier
            };
        });

        builder.Services.AddAuthorization();
        builder.Services.AddControllers()
            .AddApplicationPart(typeof(AuthController).Assembly)
            .AddJsonOptions(options =>
            {
                options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
            });

        _app = builder.Build();
        _app.UseAuthentication();
        _app.UseAuthorization();
        _app.MapControllers();

        await _app.StartAsync();
        await SeedReferenceDataAsync();
    }

    public HttpClient CreateClient() => _app!.GetTestClient();

    public HttpClient CreateAuthenticatedClient(Guid userId, UserRole role)
    {
        var client = CreateClient();
        var token = JwtService.GenerateAccessToken(userId, role);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    public async Task<T> ExecuteDbContextAsync<T>(Func<AppDbContext, Task<T>> action)
    {
        using var scope = _app!.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await action(db);
    }

    public async Task ExecuteDbContextAsync(Func<AppDbContext, Task> action)
    {
        using var scope = _app!.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await action(db);
    }

    public Task<Guid> SeedUserAsync(
        string username,
        string email,
        string password,
        UserRole role = UserRole.user,
        string? phone = null,
        string? address = null)
    {
        return ExecuteDbContextAsync(async db =>
        {
            var user = new User
            {
                Id = Guid.NewGuid(),
                Username = username,
                Email = EncryptionService.Encrypt(email)!,
                PasswordHash = new PasswordHashingService().HashPassword(password),
                Role = role,
                Phone = phone == null ? null : EncryptionService.Encrypt(phone),
                Address = address
            };

            db.Users.Add(user);
            await db.SaveChangesAsync();
            return user.Id;
        });
    }

    public Task<Guid> SeedShelterAsync(Guid ownerId, string name = "Test Shelter")
    {
        return ExecuteDbContextAsync(async db =>
        {
            var shelter = new Shelter
            {
                Id = Guid.NewGuid(),
                Name = name,
                Address = "Shelter street 1",
                OwnerId = ownerId,
                Email = EncryptionService.Encrypt($"{name.Replace(" ", "").ToLowerInvariant()}@test.com")
            };

            db.Shelters.Add(shelter);
            await db.SaveChangesAsync();
            return shelter.Id;
        });
    }

    public Task<Guid> SeedPetAsync(Guid shelterId, string name = "Buddy", int speciesId = 1, int statusId = 1)
    {
        return ExecuteDbContextAsync(async db =>
        {
            var pet = new Pet
            {
                Id = Guid.NewGuid(),
                Name = name,
                SpeciesId = speciesId,
                BreedId = 1,
                GenderId = 1,
                StatusId = statusId,
                ShelterId = shelterId,
                CreatedAt = DateTime.UtcNow
            };

            db.Pets.Add(pet);
            await db.SaveChangesAsync();
            return pet.Id;
        });
    }

    public Task<Guid> SeedDeviceAsync(Guid userId, string mac, string name = "Device", string location = "Room")
    {
        return ExecuteDbContextAsync(async db =>
        {
            var device = new Device
            {
                Id = Guid.NewGuid(),
                DeviceId = mac,
                Name = name,
                Location = location,
                UserId = userId,
                RegisteredAt = DateTime.UtcNow
            };

            db.Devices.Add(device);
            await db.SaveChangesAsync();
            return device.Id;
        });
    }

    public async ValueTask DisposeAsync()
    {
        if (_app != null)
            await _app.DisposeAsync();
    }

    private async Task SeedReferenceDataAsync()
    {
        await ExecuteDbContextAsync(async db =>
        {
            db.Species.AddRange(
                new Species { Id = 1, Name = "Dog" },
                new Species { Id = 2, Name = "Cat" });

            db.Breeds.AddRange(
                new Breed { Id = 1, SpeciesId = 1, Name = "Labrador" },
                new Breed { Id = 2, SpeciesId = 2, Name = "Persian" });

            db.Genders.AddRange(
                new Gender { Id = 1, Name = "Male" },
                new Gender { Id = 2, Name = "Female" });

            db.AdoptionStatuses.AddRange(
                new AdoptionStatus { Id = 1, Name = "available" },
                new AdoptionStatus { Id = 2, Name = "adopted" });

            await db.SaveChangesAsync();
        });
    }
}
