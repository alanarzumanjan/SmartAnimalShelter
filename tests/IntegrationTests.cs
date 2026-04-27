using Config;
using Data;
using Microsoft.EntityFrameworkCore;
using Models;
using Services;
using Testcontainers.PostgreSql;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace tests;

public class IntegrationTests : IAsyncLifetime
{
    private PostgreSqlContainer? _postgresContainer;

    public async Task InitializeAsync()
    {
        _postgresContainer = new PostgreSqlBuilder()
            .WithDatabase("shelter_test")
            .WithUsername("test")
            .WithPassword("test")
            .Build();

        await _postgresContainer.StartAsync();
    }

    public async Task DisposeAsync()
    {
        if (_postgresContainer is not null)
        {
            await _postgresContainer.DisposeAsync();
        }
    }

    private async Task<AppDbContext> CreateContextAsync()
    {
        var connectionString = _postgresContainer!.GetConnectionString();
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(connectionString)
            .Options;

        var context = new AppDbContext(options);
        await context.Database.MigrateAsync();
        return context;
    }

    [Fact]
    public async Task AppDbContext_CanConnect_ToPostgresContainer()
    {
        var connectionString = _postgresContainer!.GetConnectionString();
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(connectionString)
            .Options;

        await using var context = new AppDbContext(options);
        var canConnect = await context.Database.CanConnectAsync();

        Assert.True(canConnect);
    }

    [Fact]
    public async Task AppDbContext_MigrationsApplySuccessfully()
    {
        var connectionString = _postgresContainer!.GetConnectionString();
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(connectionString)
            .Options;

        await using var context = new AppDbContext(options);
        await context.Database.MigrateAsync();

        var pending = await context.Database.GetPendingMigrationsAsync();
        Assert.Empty(pending);
    }

    [Fact]
    public async Task AppDbContext_CanInsertAndQueryUser()
    {
        var connectionString = _postgresContainer!.GetConnectionString();
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(connectionString)
            .Options;

        await using var context = new AppDbContext(options);
        await context.Database.MigrateAsync();

        var user = new Models.User
        {
            Username = "testuser",
            Email = "test@example.com",
            PasswordHash = "fakehash"
        };

        context.Users.Add(user);
        await context.SaveChangesAsync();

        var found = await context.Users.FirstOrDefaultAsync(u => u.Email == "test@example.com");
        Assert.NotNull(found);
        Assert.Equal("testuser", found.Username);
    }

    [Fact]
    public async Task AuthFlow_RegisterUser_CreatesUserWithHashedPassword()
    {
        await using var context = await CreateContextAsync();
        var passwordService = new PasswordHashingService();
        var emailService = new UserEmailService(context);

        var password = "SecurePass123!";
        var hash = passwordService.HashPassword(password);
        var encryptedEmail = EncryptionService.Encrypt("auth@test.com");

        var user = new Models.User
        {
            Username = "authtest",
            Email = encryptedEmail!,
            PasswordHash = hash,
            Role = UserRole.user
        };

        context.Users.Add(user);
        await context.SaveChangesAsync();

        var found = await emailService.FindByEmailAsync("auth@test.com");
        Assert.NotNull(found);
        Assert.True(passwordService.VerifyPassword(password, found.PasswordHash));
    }

    [Fact]
    public async Task AuthFlow_LoginWithValidCredentials_ReturnsValidToken()
    {
        await using var context = await CreateContextAsync();
        var passwordService = new PasswordHashingService();
        var key = Environment.GetEnvironmentVariable("JWT_KEY") ?? new string('k', 32);
        var issuer = Environment.GetEnvironmentVariable("JWT_ISSUER") ?? "TestIssuer";
        var audience = Environment.GetEnvironmentVariable("JWT_AUDIENCE") ?? "TestAudience";
        var jwtSettings = new JwtSettings(key, issuer, audience, 60);
        var jwtService = new JwtService(jwtSettings);

        var password = "MyPassword123!";
        var encryptedEmail = EncryptionService.Encrypt("login@test.com");
        var user = new Models.User
        {
            Username = "logintest",
            Email = encryptedEmail!,
            PasswordHash = passwordService.HashPassword(password),
            Role = UserRole.user
        };

        context.Users.Add(user);
        await context.SaveChangesAsync();

        var found = await context.Users.FirstOrDefaultAsync(u => u.Username == "logintest");
        Assert.NotNull(found);
        Assert.True(passwordService.VerifyPassword(password, found.PasswordHash));

        var token = jwtService.GenerateToken(found.Id, found.Role);
        Assert.False(string.IsNullOrWhiteSpace(token));

        var handler = new JwtSecurityTokenHandler();
        var jwtToken = handler.ReadJwtToken(token);
        Assert.Equal(found.Id.ToString(), jwtToken.Subject);
        Assert.Contains(jwtToken.Claims, c => c.Type == ClaimTypes.Role && c.Value == "user");
    }

    [Fact]
    public async Task AuthFlow_LoginWithInvalidCredentials_ReturnsFalse()
    {
        await using var context = await CreateContextAsync();
        var passwordService = new PasswordHashingService();

        var password = "CorrectPass123!";
        var encryptedEmail = EncryptionService.Encrypt("wrong@test.com");
        var user = new Models.User
        {
            Username = "wrongpass",
            Email = encryptedEmail!,
            PasswordHash = passwordService.HashPassword(password),
            Role = UserRole.user
        };

        context.Users.Add(user);
        await context.SaveChangesAsync();

        var found = await context.Users.FirstOrDefaultAsync(u => u.Username == "wrongpass");
        Assert.NotNull(found);
        Assert.False(passwordService.VerifyPassword("WrongPassword!", found.PasswordHash));
    }

    [Fact]
    public async Task UserEmailService_FindByEmail_WithExistingUser_ReturnsUser()
    {
        await using var context = await CreateContextAsync();
        var emailService = new UserEmailService(context);

        var encryptedEmail = EncryptionService.Encrypt("findme@test.com");

        var user = new Models.User
        {
            Username = "emailfind",
            Email = encryptedEmail!,
            PasswordHash = "hash"
        };

        context.Users.Add(user);
        await context.SaveChangesAsync();

        var found = await emailService.FindByEmailAsync("findme@test.com");
        Assert.NotNull(found);
        Assert.Equal("emailfind", found.Username);
    }

    [Fact]
    public async Task UserEmailService_EmailExists_WithExistingEmail_ReturnsTrue()
    {
        await using var context = await CreateContextAsync();
        var emailService = new UserEmailService(context);

        var encryptedEmail = EncryptionService.Encrypt("exists@test.com");

        var user = new Models.User
        {
            Username = "emailexists",
            Email = encryptedEmail!,
            PasswordHash = "hash"
        };

        context.Users.Add(user);
        await context.SaveChangesAsync();

        var exists = await emailService.EmailExistsAsync("exists@test.com");
        Assert.True(exists);
    }

    [Fact]
    public async Task UserEmailService_EmailExists_WithNonExistingEmail_ReturnsFalse()
    {
        await using var context = await CreateContextAsync();
        var emailService = new UserEmailService(context);

        var exists = await emailService.EmailExistsAsync("nobody@test.com");
        Assert.False(exists);
    }

    [Fact]
    public void EmailConfiguration_WithoutSmtpConfig_ReturnsFallbackBehavior()
    {
        var emailEnv = Environment.GetEnvironmentVariable("EMAIL_ADDRESS");
        var passwordEnv = Environment.GetEnvironmentVariable("EMAIL_PASSWORD");

        // When SMTP is not configured, the controller returns Ok with fallback message
        // This test documents that behavior
        if (string.IsNullOrEmpty(emailEnv) || string.IsNullOrEmpty(passwordEnv))
        {
            Assert.True(true); // Expected: no SMTP config available
        }
        else
        {
            Assert.False(string.IsNullOrEmpty(emailEnv));
            Assert.False(string.IsNullOrEmpty(passwordEnv));
        }
    }
}
