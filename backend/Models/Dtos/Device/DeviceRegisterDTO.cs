namespace Dtos;

public class DeviceRegisterDTO
{
    public string Id { get; set; } = default!;
    public string? Name { get; set; }
    public string? Location { get; set; }
    public Guid UserId { get; set; }
}
