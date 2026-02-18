namespace Dtos;

public sealed class DeviceUsersEnrollRequest
{
    public string DeviceId { get; init; } = default!;
    public Guid UserId { get; init; }
}

public sealed class DeviceUsersEnrollResponse
{
    public Guid DeviceUsersId { get; init; }
    public string DeviceKey { get; init; } = default!;
}
