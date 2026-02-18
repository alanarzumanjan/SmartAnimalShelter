using System.Text.Json.Serialization;
using Models;

namespace Dtos;

public class MeasurementOutDTO
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("deviceId")]
    public string? DeviceId { get; set; }

    [JsonPropertyName("co2")]
    public double CO2 { get; set; }

    [JsonPropertyName("temperature")]
    public double Temperature { get; set; }

    [JsonPropertyName("humidity")]
    public double Humidity { get; set; }

    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; set; }

    [JsonPropertyName("userId")]
    public Guid UserId { get; set; }

    public static MeasurementOutDTO FromEntity(Measurement m) => new()
    {
        Id = m.Id,
        DeviceId = m.DeviceId,
        CO2 = m.CO2,
        Temperature = m.Temperature,
        Humidity = m.Humidity,
        Timestamp = m.Timestamp,
        UserId = m.UserId
    };
}
