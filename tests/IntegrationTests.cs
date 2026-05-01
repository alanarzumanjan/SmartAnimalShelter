using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Config;
using Data;
using Microsoft.EntityFrameworkCore;
using Models;
using Services;

namespace tests;

public class IntegrationTests : IAsyncLifetime
{
    private const string TestKeyBase64 = "MTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTI=";
    private AppDbContext? _context;

    public async Task InitializeAsync()
    {
        Environment.SetEnvironmentVariable("ENCRYPTION_KEY", TestKeyBase64);
        EncryptionService.Initialize(TestKeyBase64);

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"integration-{Guid.NewGuid():N}")
            .Options;

        _context = new AppDbContext(options);
        await _context.Database.EnsureCreatedAsync();
    }

    public async Task DisposeAsync()
    {
        if (_context != null)
        {
            await _context.Database.EnsureDeletedAsync();
            await _context.DisposeAsync();
        }
    }

    [Fact]
    public async Task AppDbContext_CanInsertAndQueryUser()
    {
        var user = new User
        {
            Username = "testuser",
            Email = EncryptionService.Encrypt("test@example.com")!,
            PasswordHash = "fakehash"
        };

        _context!.Users.Add(user);
        await _context.SaveChangesAsync();

        var found = await _context.Users.FirstOrDefaultAsync(u => u.Username == "testuser");
        Assert.NotNull(found);
        Assert.Equal("testuser", found!.Username);
    }

    [Fact]
    public async Task AuthFlow_RegisterUser_CreatesHashedPassword()
    {
        var passwordService = new PasswordHashingService();
        var emailService = new UserEmailService(_context!);
        var password = "SecurePass123!";

        var user = new User
        {
            Username = "authtest",
            Email = EncryptionService.Encrypt("auth@test.com")!,
            PasswordHash = passwordService.HashPassword(password),
            Role = UserRole.user
        };

        _context!.Users.Add(user);
        await _context.SaveChangesAsync();

        var found = await emailService.FindByEmailAsync("auth@test.com");
        Assert.NotNull(found);
        Assert.True(passwordService.VerifyPassword(password, found!.PasswordHash));
    }

    [Fact]
    public async Task AuthFlow_LoginWithValidCredentials_ReturnsValidToken()
    {
        var passwordService = new PasswordHashingService();
        var jwtSettings = new JwtSettings(new string('k', 32), "TestIssuer", "TestAudience", 60, 7);
        var jwtService = new JwtService(jwtSettings);

        var user = new User
        {
            Username = "logintest",
            Email = EncryptionService.Encrypt("login@test.com")!,
            PasswordHash = passwordService.HashPassword("MyPassword123!"),
            Role = UserRole.user
        };

        _context!.Users.Add(user);
        await _context.SaveChangesAsync();

        var token = jwtService.GenerateToken(user.Id, user.Role);

        Assert.False(string.IsNullOrWhiteSpace(token));

        var handler = new JwtSecurityTokenHandler();
        var jwtToken = handler.ReadJwtToken(token);
        Assert.Equal(user.Id.ToString(), jwtToken.Subject);
        Assert.Contains(jwtToken.Claims, c => c.Type == ClaimTypes.Role && c.Value == "user");
    }

    [Fact]
    public async Task UserEmailService_FindByEmail_WithExistingUser_ReturnsUser()
    {
        var emailService = new UserEmailService(_context!);
        var user = new User
        {
            Username = "emailfind",
            Email = EncryptionService.Encrypt("findme@test.com")!,
            PasswordHash = "hash"
        };

        _context!.Users.Add(user);
        await _context.SaveChangesAsync();

        var found = await emailService.FindByEmailAsync("findme@test.com");
        Assert.NotNull(found);
        Assert.Equal("emailfind", found!.Username);
    }

    [Fact]
    public async Task UserEmailService_EmailExists_WithExistingEmail_ReturnsTrue()
    {
        var emailService = new UserEmailService(_context!);
        var user = new User
        {
            Username = "emailexists",
            Email = EncryptionService.Encrypt("exists@test.com")!,
            PasswordHash = "hash"
        };

        _context!.Users.Add(user);
        await _context.SaveChangesAsync();

        var exists = await emailService.EmailExistsAsync("exists@test.com");
        Assert.True(exists);
    }
}
