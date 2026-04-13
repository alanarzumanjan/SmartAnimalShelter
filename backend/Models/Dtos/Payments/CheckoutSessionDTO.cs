namespace Dtos;

public sealed class CheckoutSessionDTO
{
    public string Id { get; init; } = default!;
    public string Url { get; init; } = default!;
    public string? Status { get; init; }
    public string? PaymentStatus { get; init; }
}
