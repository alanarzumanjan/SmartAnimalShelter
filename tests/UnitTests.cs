using Config;
using Services;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.Text;

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
            expireMinutes: 60
        );
        var jwtService = new JwtService(settings);
        var userId = Guid.NewGuid();

        var token = jwtService.GenerateToken(userId, "user");

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
        var config = new ConfigurationBuilder().Build();

        var ex = Record.Exception(() => JwtSettings.FromConfiguration(config));
        Assert.IsType<InvalidOperationException>(ex);
    }

    [Fact]
    public void JwtService_GenerateToken_WithRealKey_ReturnsValidToken()
    {
        var key = Environment.GetEnvironmentVariable("JWT_KEY") ?? new string('x', 32);
        var issuer = Environment.GetEnvironmentVariable("JWT_ISSUER") ?? "TestIssuer";
        var audience = Environment.GetEnvironmentVariable("JWT_AUDIENCE") ?? "TestAudience";

        var settings = new JwtSettings(key, issuer, audience, 60);
        var jwtService = new JwtService(settings);
        var userId = Guid.NewGuid();

        var token = jwtService.GenerateToken(userId, "admin");

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

        var settings = new JwtSettings(key, issuer, audience, 60);
        var jwtService = new JwtService(settings);
        var userId = Guid.NewGuid();

        var token = jwtService.GenerateToken(userId, "user");

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

