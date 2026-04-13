namespace Dtos;

public sealed class CreateCheckoutSessionDTO
{
    public int Quantity { get; set; } = 1;
    public string? CustomerEmail { get; set; }
    public string? CustomerName { get; set; }
    public string? UserId { get; set; }
}
