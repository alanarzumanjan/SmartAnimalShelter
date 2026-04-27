using Data;
using Microsoft.EntityFrameworkCore;
using Models;

namespace Services.Payments;

public sealed class OrderService
{
    private readonly AppDbContext _dbContext;

    public OrderService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Order?> GetOrderByStripeSessionIdAsync(string stripeSessionId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Orders
            .FirstOrDefaultAsync(o => o.StripeSessionId == stripeSessionId, cancellationToken);
    }

    public async Task<Order> CreateOrderAsync(
        Guid userId,
        string stripeSessionId,
        string productName,
        string productType,
        int quantity,
        string currency,
        long amountTotal,
        string? customerEmail,
        string? customerName,
        CancellationToken cancellationToken = default)
    {
        var order = new Models.Order
        {
            UserId = userId,
            StripeSessionId = stripeSessionId,
            ProductName = productName,
            ProductType = productType,
            Quantity = quantity,
            Currency = currency,
            AmountTotal = amountTotal,
            CustomerEmail = customerEmail,
            CustomerName = customerName,
            Status = OrderStatus.pending
        };

        _dbContext.Orders.Add(order);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return order;
    }

    public async Task MarkOrderAsPaidAsync(
        string stripeSessionId,
        string? paymentIntentId,
        CancellationToken cancellationToken = default)
    {
        var order = await _dbContext.Orders
            .FirstOrDefaultAsync(o => o.StripeSessionId == stripeSessionId, cancellationToken);

        if (order == null)
        {
            throw new InvalidOperationException($"Order with Stripe session {stripeSessionId} not found.");
        }

        order.Status = OrderStatus.paid;
        order.StripePaymentIntentId = paymentIntentId;
        order.PaidAt = DateTime.UtcNow;
        order.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task MarkOrderAsFailedAsync(
        string stripeSessionId,
        CancellationToken cancellationToken = default)
    {
        var order = await _dbContext.Orders
            .FirstOrDefaultAsync(o => o.StripeSessionId == stripeSessionId, cancellationToken);

        if (order == null)
        {
            throw new InvalidOperationException($"Order with Stripe session {stripeSessionId} not found.");
        }

        order.Status = OrderStatus.failed;
        order.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<List<Order>> GetUserOrdersAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Orders
            .Where(o => o.UserId == userId)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<Order?> GetUserOrderByIdAsync(Guid orderId, Guid userId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Orders
            .FirstOrDefaultAsync(o => o.Id == orderId && o.UserId == userId, cancellationToken);
    }
}
