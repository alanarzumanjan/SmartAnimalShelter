namespace Dtos.Payments;

public sealed class OrderDTO
{
    public Guid Id { get; init; }
    public Guid UserId { get; init; }
    public string StripeSessionId { get; set; } = null!;
    public string? StripePaymentIntentId { get; set; }
    public string ProductType { get; set; } = null!;
    public string ProductName { get; set; } = null!;
    public int Quantity { get; set; }
    public string Currency { get; set; } = null!;
    public long AmountTotal { get; set; }
    public string Status { get; set; } = null!;
    public string? CustomerEmail { get; set; }
    public string? CustomerName { get; set; }
    public string? ShippingAddress { get; set; }
    public string? CustomerPhone { get; set; }
    public DateTime CreatedAt { get; init; }
    public DateTime? PaidAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public static OrderDTO FromEntity(Models.Order order) => new()
    {
        Id = order.Id,
        UserId = order.UserId,
        StripeSessionId = order.StripeSessionId,
        StripePaymentIntentId = order.StripePaymentIntentId,
        ProductType = order.ProductType,
        ProductName = order.ProductName,
        Quantity = order.Quantity,
        Currency = order.Currency,
        AmountTotal = order.AmountTotal,
        Status = order.Status.ToString(),
        CustomerEmail = order.CustomerEmail,
        CustomerName = order.CustomerName,
        ShippingAddress = order.ShippingAddress,
        CustomerPhone = order.CustomerPhone,
        CreatedAt = order.CreatedAt,
        PaidAt = order.PaidAt,
        UpdatedAt = order.UpdatedAt
    };
}
