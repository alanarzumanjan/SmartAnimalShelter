using Config;
using Services;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Models;

namespace tests;

public class UnitTests
{
    [Fact]
    public void PasswordHashingService_HashPassword_ReturnsNonEmptyHash()
    {
        var service = new PasswordHashingService();
        var hash = service.HashPassword("TestPassword123!");

        Assert.False(string.IsNullOrWhiteSpace(hash));
        Assert.NotEqual("TestPassword123!", hash);
    }

    [Fact]
    public void PasswordHashingService_VerifyPassword_WithCorrectPassword_ReturnsTrue()
    {
        var service = new PasswordHashingService();
        var password = "MySecurePassword!";
        var hash = service.HashPassword(password);

        var result = service.VerifyPassword(password, hash);

        Assert.True(result);
    }

    [Fact]
    public void PasswordHashingService_VerifyPassword_WithWrongPassword_ReturnsFalse()
    {
        var service = new PasswordHashingService();
        var hash = service.HashPassword("CorrectPassword!");

        var result = service.VerifyPassword("WrongPassword!", hash);

        Assert.False(result);
    }

    [Fact]
    public void JwtService_GenerateToken_ReturnsValidJwt()
    {
var settings = new JwtSettings(
            key: new string('a', 32),
            issuer: "TestIssuer",
            audience: "TestAudience",
            accessTokenExpireMinutes: 60,
            refreshTokenExpireDays: 7
        );
        var jwtService = new JwtService(settings);
        var userId = Guid.NewGuid();

        var token = jwtService.GenerateToken(userId, UserRole.user);

        Assert.False(string.IsNullOrWhiteSpace(token));

        var handler = new JwtSecurityTokenHandler();
        var jwtToken = handler.ReadJwtToken(token);

        Assert.Equal("TestIssuer", jwtToken.Issuer);
        Assert.Equal("TestAudience", jwtToken.Audiences.First());
        Assert.Equal(userId.ToString(), jwtToken.Subject);
        Assert.Contains(jwtToken.Claims, c => c.Type == ClaimTypes.Role && c.Value == "user");
    }

    [Fact]
    public void JwtSettings_FromConfiguration_ThrowsWhenKeyMissing()
    {
        // Temporarily clear JWT_KEY from environment to test missing key behavior
        var originalKey = Environment.GetEnvironmentVariable("JWT_KEY");
        var originalIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER");
        var originalAudience = Environment.GetEnvironmentVariable("JWT_AUDIENCE");

        try
        {
            Environment.SetEnvironmentVariable("JWT_KEY", null);
            Environment.SetEnvironmentVariable("JWT_ISSUER", null);
            Environment.SetEnvironmentVariable("JWT_AUDIENCE", null);

            var config = new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>())
                .Build();

            var ex = Record.Exception(() => JwtSettings.FromConfiguration(config));
            Assert.IsType<InvalidOperationException>(ex);
        }
        finally
        {
            // Restore original values
            Environment.SetEnvironmentVariable("JWT_KEY", originalKey);
            Environment.SetEnvironmentVariable("JWT_ISSUER", originalIssuer);
            Environment.SetEnvironmentVariable("JWT_AUDIENCE", originalAudience);
        }
    }

    [Fact]
    public void JwtService_GenerateToken_WithRealKey_ReturnsValidToken()
    {
        var key = Environment.GetEnvironmentVariable("JWT_KEY") ?? new string('x', 32);
        var issuer = Environment.GetEnvironmentVariable("JWT_ISSUER") ?? "TestIssuer";
        var audience = Environment.GetEnvironmentVariable("JWT_AUDIENCE") ?? "TestAudience";

var settings = new JwtSettings(key, issuer, audience, 60, 7);
        var jwtService = new JwtService(settings);
        var userId = Guid.NewGuid();

        var token = jwtService.GenerateToken(userId, UserRole.admin);

        Assert.False(string.IsNullOrWhiteSpace(token));

        var handler = new JwtSecurityTokenHandler();
        var jwtToken = handler.ReadJwtToken(token);

        Assert.Equal(issuer, jwtToken.Issuer);
        Assert.Equal(audience, jwtToken.Audiences.First());
        Assert.Equal(userId.ToString(), jwtToken.Subject);
        Assert.Contains(jwtToken.Claims, c => c.Type == ClaimTypes.Role && c.Value == "admin");
        Assert.True(jwtToken.ValidTo > DateTime.UtcNow);
    }

    [Fact]
    public void JwtService_GeneratedToken_CanBeValidated_WithRealKey()
    {
        var key = Environment.GetEnvironmentVariable("JWT_KEY") ?? new string('x', 32);
        var issuer = Environment.GetEnvironmentVariable("JWT_ISSUER") ?? "TestIssuer";
var audience = Environment.GetEnvironmentVariable("JWT_AUDIENCE") ?? "TestAudience";

        var settings = new JwtSettings(key, issuer, audience, 60, 7);
        var jwtService = new JwtService(settings);
        var userId = Guid.NewGuid();

        var token = jwtService.GenerateToken(userId, UserRole.user);

        var handler = new JwtSecurityTokenHandler();
        var validationParams = new TokenValidationParameters
        {
            ValidateIssuer = !string.IsNullOrWhiteSpace(issuer),
            ValidateAudience = !string.IsNullOrWhiteSpace(audience),
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = issuer,
            ValidAudience = audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
            ClockSkew = TimeSpan.Zero
        };

        var principal = handler.ValidateToken(token, validationParams, out var validatedToken);

        Assert.NotNull(validatedToken);
        Assert.Equal(userId.ToString(), principal.FindFirst(ClaimTypes.NameIdentifier)?.Value);
        Assert.Equal("user", principal.FindFirst(ClaimTypes.Role)?.Value);
    }

    [Fact]
    public void JwtSettings_FromEnvironmentVariables_ReturnsCorrectValues()
    {
        var key = Environment.GetEnvironmentVariable("JWT_KEY");
        if (string.IsNullOrWhiteSpace(key))
        {
            // Skip if no env var set
            return;
        }

        var config = new ConfigurationBuilder()
            .AddEnvironmentVariables()
            .Build();

        var settings = JwtSettings.FromConfiguration(config);

        Assert.Equal(key, settings.Key);
        Assert.True(settings.ExpireMinutes > 0);
    }
}

public class EncryptionServiceTests : IDisposable
{
    private readonly string? _originalKey;
    private const string TestKeyBase64 = "MTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTI=";

    public EncryptionServiceTests()
    {
        _originalKey = Environment.GetEnvironmentVariable("ENCRYPTION_KEY");
        Environment.SetEnvironmentVariable("ENCRYPTION_KEY", TestKeyBase64);
        EncryptionService.Initialize(TestKeyBase64);
    }

    public void Dispose()
    {
        Environment.SetEnvironmentVariable("ENCRYPTION_KEY", _originalKey);
    }

    [Fact]
    public void EncryptDecrypt_Roundtrip_ReturnsOriginal()
    {
        var original = "test@example.com";
        var encrypted = EncryptionService.Encrypt(original);
        Assert.NotNull(encrypted);
        Assert.NotEqual(original, encrypted);

        var decrypted = EncryptionService.Decrypt(encrypted);
        Assert.Equal(original, decrypted);
    }

    [Fact]
    public void Encrypt_NullOrEmpty_ReturnsNull()
    {
        Assert.Null(EncryptionService.Encrypt(null));
        Assert.Null(EncryptionService.Encrypt(""));
        Assert.Null(EncryptionService.Encrypt("   "));
    }

    [Fact]
    public void Decrypt_NullOrEmpty_ReturnsNull()
    {
        Assert.Null(EncryptionService.Decrypt(null));
        Assert.Null(EncryptionService.Decrypt(""));
        Assert.Null(EncryptionService.Decrypt("   "));
    }

    [Fact]
    public void Hash_SameInput_ReturnsSameHash()
    {
        var input = "Test@Example.COM";
        var hash1 = EncryptionService.Hash(input);
        var hash2 = EncryptionService.Hash(input);

        Assert.Equal(hash1, hash2);
    }

    [Fact]
    public void Hash_DifferentInput_ReturnsDifferentHash()
    {
        var hash1 = EncryptionService.Hash("input1");
        var hash2 = EncryptionService.Hash("input2");

        Assert.NotEqual(hash1, hash2);
    }

    [Fact]
    public void EmailMatchesEncryptedValue_ValidEmails_ReturnsTrue()
    {
        var email = "User@Example.COM";
        var encrypted = EncryptionService.Encrypt(email);

        Assert.True(EncryptionService.EmailMatchesEncryptedValue(encrypted, email));
        Assert.True(EncryptionService.EmailMatchesEncryptedValue(encrypted, "user@example.com"));
    }

    [Fact]
    public void EmailMatchesEncryptedValue_InvalidEmails_ReturnsFalse()
    {
        var email = "user@example.com";
        var encrypted = EncryptionService.Encrypt(email);

        Assert.False(EncryptionService.EmailMatchesEncryptedValue(encrypted, "other@example.com"));
        Assert.False(EncryptionService.EmailMatchesEncryptedValue(encrypted, null));
    }
}
