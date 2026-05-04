using System.Text.Json.Serialization;
using Models;

namespace Dtos;

public sealed class DeviceOutDTO
{
    [JsonPropertyName("id")]
    public string Id { get; init; } = default!;

    [JsonPropertyName("uuid")]
    public Guid Uuid { get; init; }

    [JsonPropertyName("deviceId")]
    public string DeviceId { get; init; } = default!;

    [JsonPropertyName("name")]
    public string? Name { get; init; }

    [JsonPropertyName("location")]
    public string? Location { get; init; }

    [JsonPropertyName("description")]
    public string? Description { get; init; }

    [JsonPropertyName("registeredAt")]
    public DateTime RegisteredAt { get; init; }

    [JsonPropertyName("lastSeenAt")]
    public DateTime? LastSeenAt { get; init; }

    [JsonPropertyName("userId")]
    public Guid UserId { get; init; }

    [JsonPropertyName("enclosureName")]
    public string? EnclosureName { get; init; }

    public static DeviceOutDTO FromEntity(Device d, string? enclosureName = null) => new()
    {
        Id = d.DeviceId,
        Uuid = d.Id,
        DeviceId = d.DeviceId,
        Name = d.Name,
        Location = d.Location,
        Description = d.Description,
        RegisteredAt = d.RegisteredAt,
        LastSeenAt = d.LastSeenAt,
        UserId = d.UserId,
        EnclosureName = enclosureName
    };
}
