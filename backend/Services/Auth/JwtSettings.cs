namespace Config;

public sealed class JwtSettings
{
    public const int DefaultAccessTokenExpireMinutes = 15;
    public const int DefaultRefreshTokenExpireDays = 7;

    public JwtSettings(string key, string? issuer, string? audience, int accessTokenExpireMinutes, int refreshTokenExpireDays)
    {
        Key = key;
        Issuer = issuer;
        Audience = audience;
        AccessTokenExpireMinutes = accessTokenExpireMinutes;
        RefreshTokenExpireDays = refreshTokenExpireDays;
    }

    public string Key { get; }
    public string? Issuer { get; }
    public string? Audience { get; }
    public int AccessTokenExpireMinutes { get; }
    public int RefreshTokenExpireDays { get; }

    public int ExpireMinutes => AccessTokenExpireMinutes;

    public static JwtSettings FromConfiguration(IConfiguration configuration)
    {
        var key = GetRequiredValue(configuration, "JWT_KEY", "Jwt:Key");
        var issuer = GetOptionalValue(configuration, "JWT_ISSUER", "Jwt:Issuer");
        var audience = GetOptionalValue(configuration, "JWT_AUDIENCE", "Jwt:Audience");
        var accessTokenExpireMinutes = GetPositiveIntValue(configuration, DefaultAccessTokenExpireMinutes, "JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "Jwt:AccessTokenExpireMinutes");
        var refreshTokenExpireDays = GetPositiveIntValue(configuration, DefaultRefreshTokenExpireDays, "JWT_REFRESH_TOKEN_EXPIRE_DAYS", "Jwt:RefreshTokenExpireDays");

        return new JwtSettings(key, issuer, audience, accessTokenExpireMinutes, refreshTokenExpireDays);
    }

    private static string GetRequiredValue(IConfiguration configuration, params string[] keys)
    {
        foreach (var key in keys)
        {
            var value = configuration[key] ?? Environment.GetEnvironmentVariable(key);
            if (!string.IsNullOrWhiteSpace(value))
                return value.Trim();
        }

        throw new InvalidOperationException($"JWT setting '{keys[0]}' is required.");
    }

    private static string? GetOptionalValue(IConfiguration configuration, params string[] keys)
    {
        foreach (var key in keys)
        {
            var value = configuration[key] ?? Environment.GetEnvironmentVariable(key);
            if (!string.IsNullOrWhiteSpace(value))
                return value.Trim();
        }

        return null;
    }

    private static int GetPositiveIntValue(IConfiguration configuration, int fallbackValue, params string[] keys)
    {
        foreach (var key in keys)
        {
            var value = configuration[key] ?? Environment.GetEnvironmentVariable(key);
            if (int.TryParse(value, out var parsedValue) && parsedValue > 0)
                return parsedValue;
        }

        return fallbackValue;
    }
}
