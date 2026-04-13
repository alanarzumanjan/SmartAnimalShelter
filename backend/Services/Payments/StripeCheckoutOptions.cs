using Microsoft.Extensions.Configuration;

namespace Services.Payments;

public sealed class StripeCheckoutOptions
{
    public string? SecretKey { get; init; }
    public string? WebhookSecret { get; init; }
    public string Currency { get; init; } = "eur";
    public string FrontendBaseUrl { get; init; } = "http://localhost:5173";
    public string DeviceName { get; init; } = "Smart Shelter IoT Device";
    public string DeviceDescription { get; init; } =
        "Environmental monitoring device with CO2, temperature, and humidity tracking.";
    public long DeviceUnitAmount { get; init; } = 24900;
    public IReadOnlyList<string> AllowedShippingCountries { get; init; } = [];

    public bool IsConfigured => !string.IsNullOrWhiteSpace(SecretKey);
    public bool IsWebhookConfigured => !string.IsNullOrWhiteSpace(WebhookSecret) && IsConfigured;

    public static StripeCheckoutOptions FromConfiguration(IConfiguration configuration)
    {
        var frontendBaseUrl =
            GetOptionalValue(configuration, "FRONTEND_APP_URL")
            ?? GetOptionalValue(configuration, "ALLOWED_FRONTEND_PORT")
            ?? "http://localhost:5173";

        var deviceUnitAmount = GetPositiveLongValue(
            configuration,
            24900,
            "STRIPE_DEVICE_UNIT_AMOUNT");

        return new StripeCheckoutOptions
        {
            SecretKey = GetOptionalValue(configuration, "STRIPE_SECRET_KEY"),
            WebhookSecret = GetOptionalValue(configuration, "STRIPE_WEBHOOK_SECRET"),
            Currency = (GetOptionalValue(configuration, "STRIPE_CURRENCY") ?? "eur").Trim().ToLowerInvariant(),
            FrontendBaseUrl = frontendBaseUrl.TrimEnd('/'),
            DeviceName = GetOptionalValue(configuration, "STRIPE_DEVICE_NAME") ?? "Smart Shelter IoT Device",
            DeviceDescription = GetOptionalValue(configuration, "STRIPE_DEVICE_DESCRIPTION")
                ?? "Environmental monitoring device with CO2, temperature, and humidity tracking.",
            DeviceUnitAmount = deviceUnitAmount,
            AllowedShippingCountries = ParseCsv(configuration["STRIPE_ALLOWED_SHIPPING_COUNTRIES"])
        };
    }

    private static string? GetOptionalValue(IConfiguration configuration, params string[] keys)
    {
        foreach (var key in keys)
        {
            var value = configuration[key];
            if (!string.IsNullOrWhiteSpace(value))
            {
                return value.Trim();
            }
        }

        return null;
    }

    private static long GetPositiveLongValue(IConfiguration configuration, long fallback, params string[] keys)
    {
        var raw = GetOptionalValue(configuration, keys);
        if (!string.IsNullOrWhiteSpace(raw) && long.TryParse(raw, out var parsed) && parsed > 0)
        {
            return parsed;
        }

        return fallback;
    }

    private static IReadOnlyList<string> ParseCsv(string? value) =>
        string.IsNullOrWhiteSpace(value)
            ? []
            : value
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(entry => entry.ToUpperInvariant())
                .Distinct()
                .ToArray();
}
