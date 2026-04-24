using Config;
using Services;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.Extensions.Configuration;

namespace backend.Tests;

public class UnitTest1
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
}

