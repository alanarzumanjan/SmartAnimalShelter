namespace Config;

public sealed class JwtSettings
{
    public const int DefaultExpireMinutes = 60;

    public JwtSettings(string key, string? issuer, string? audience, int expireMinutes)
    {
        Key = key;
        Issuer = issuer;
        Audience = audience;
        ExpireMinutes = expireMinutes;
    }

    public string Key { get; }
    public string? Issuer { get; }
    public string? Audience { get; }
    public int ExpireMinutes { get; }

    public static JwtSettings FromConfiguration(IConfiguration configuration)
    {
        var key = GetRequiredValue(configuration, "JWT_KEY", "Jwt:Key");
        var issuer = GetOptionalValue(configuration, "JWT_ISSUER", "Jwt:Issuer");
        var audience = GetOptionalValue(configuration, "JWT_AUDIENCE", "Jwt:Audience");
        var expireMinutes = GetPositiveIntValue(configuration, DefaultExpireMinutes, "JWT_EXPIRE_MINUTES", "Jwt:ExpireMinutes");

        return new JwtSettings(key, issuer, audience, expireMinutes);
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
