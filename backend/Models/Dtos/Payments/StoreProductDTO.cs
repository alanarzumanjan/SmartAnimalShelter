namespace Dtos;

public sealed class StoreProductDTO
{
    public string Name { get; init; } = default!;
    public string Description { get; init; } = default!;
    public string Currency { get; init; } = "eur";
    public long UnitAmount { get; init; }
    public bool StripeEnabled { get; init; }
}
