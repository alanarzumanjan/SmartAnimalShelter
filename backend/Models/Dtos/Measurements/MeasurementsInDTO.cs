using System.Text.Json.Serialization;

namespace Dtos;

public class MeasurementInDTO
{
    [JsonPropertyName("deviceId")]
    public string DeviceId { get; set; } = default!;

    [JsonPropertyName("co2")]
    public double CO2 { get; set; }

    [JsonPropertyName("temperature")]
    public double Temperature { get; set; }

    [JsonPropertyName("humidity")]
    public double Humidity { get; set; }

    [JsonPropertyName("timestamp")]
    public DateTime? Timestamp { get; set; }

    [JsonPropertyName("userId")]
    public Guid UserId { get; set; }
}
