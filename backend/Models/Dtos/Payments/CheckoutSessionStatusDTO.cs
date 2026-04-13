namespace Dtos;

public sealed class CheckoutSessionStatusDTO
{
    public string Id { get; init; } = default!;
    public string? Status { get; init; }
    public string? PaymentStatus { get; init; }
    public string Currency { get; init; } = "eur";
    public long AmountTotal { get; init; }
    public long AmountSubtotal { get; init; }
    public bool IsPaid { get; init; }
    public int Quantity { get; init; }
    public string ProductName { get; init; } = default!;
    public string? CustomerEmail { get; init; }
    public string? CustomerName { get; init; }
}
