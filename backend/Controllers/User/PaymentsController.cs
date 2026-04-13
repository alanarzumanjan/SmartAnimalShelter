using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Cors;
using Dtos;
using Dtos.Payments;
using Services.Payments;
using Stripe;
using Stripe.Checkout;

namespace Controllers;

[ApiController]
[Route("/payments")]
[Produces("application/json")]
public class PaymentsController : ControllerBase
{
    private readonly StripeCheckoutService _stripeCheckoutService;
    private readonly OrderService _orderService;
    private readonly StripeCheckoutOptions _stripeOptions;

    public PaymentsController(
        StripeCheckoutService stripeCheckoutService,
        OrderService orderService,
        StripeCheckoutOptions stripeOptions)
    {
        _stripeCheckoutService = stripeCheckoutService;
        _orderService = orderService;
        _stripeOptions = stripeOptions;
    }

    [HttpGet("store-product")]
    public IActionResult GetStoreProduct()
    {
        return Ok(new
        {
            data = _stripeCheckoutService.GetStoreProduct()
        });
    }

    [HttpPost("checkout-session")]
    public async Task<IActionResult> CreateCheckoutSession(
        [FromBody] CreateCheckoutSessionDTO? request,
        CancellationToken cancellationToken)
    {
        if (request is null)
        {
            return BadRequest(new { error = "Body is required." });
        }

        if (request.Quantity < 1)
        {
            return BadRequest(new { error = "Quantity must be at least 1." });
        }

        try
        {
            var session = await _stripeCheckoutService.CreateDeviceCheckoutSessionAsync(request, cancellationToken);
            return Ok(new
            {
                message = "Checkout session created.",
                data = session
            });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { error = ex.Message });
        }
        catch (StripeException ex)
        {
            Console.WriteLine($"❌ Stripe checkout error: {ex}");
            return StatusCode(StatusCodes.Status502BadGateway, new
            {
                error = ex.StripeError?.Message ?? "Failed to create Stripe Checkout session."
            });
        }
    }

    [HttpGet("checkout-session/{sessionId}")]
    public async Task<IActionResult> GetCheckoutSession(
        string sessionId,
        CancellationToken cancellationToken)
    {
        try
        {
            var status = await _stripeCheckoutService.GetCheckoutSessionStatusAsync(sessionId, cancellationToken);
            return Ok(new { data = status });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { error = ex.Message });
        }
        catch (StripeException ex)
        {
            Console.WriteLine($"❌ Stripe status lookup error: {ex}");
            return StatusCode(StatusCodes.Status502BadGateway, new
            {
                error = ex.StripeError?.Message ?? "Failed to fetch Stripe Checkout session."
            });
        }
    }

    [HttpPost("webhook")]
    [DisableCors]
    public async Task<IActionResult> StripeWebhook(CancellationToken cancellationToken)
    {
        var json = await new StreamReader(HttpContext.Request.Body).ReadToEndAsync(cancellationToken);

        Event stripeEvent;
        try
        {
            stripeEvent = EventUtility.ConstructEvent(
                json,
                Request.Headers["Stripe-Signature"],
                _stripeOptions.WebhookSecret ?? throw new InvalidOperationException("Webhook secret not configured."),
                throwOnApiVersionMismatch: false
            );
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Webhook signature verification failed: {ex.Message}");
            return BadRequest(new { error = "Webhook signature verification failed." });
        }

        try
        {
            switch (stripeEvent.Type)
            {
                case EventTypes.CheckoutSessionCompleted:
                    await HandleCheckoutSessionCompletedAsync(stripeEvent, cancellationToken);
                    break;

                case EventTypes.CheckoutSessionExpired:
                    await HandleCheckoutSessionExpiredAsync(stripeEvent, cancellationToken);
                    break;

                case EventTypes.CheckoutSessionAsyncPaymentFailed:
                    await HandleCheckoutSessionPaymentFailedAsync(stripeEvent, cancellationToken);
                    break;

                default:
                    Console.WriteLine($"⚠️ Unhandled Stripe event type: {stripeEvent.Type}");
                    break;
            }

            return Ok(new { received = true });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Webhook handler failed: {ex.Message}\n{ex}");
            return StatusCode(StatusCodes.Status500InternalServerError, new { error = "Webhook handler failed." });
        }
    }

    [HttpGet("my-orders")]
    public async Task<IActionResult> GetUserOrders(CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
        {
            return Unauthorized(new { error = "Authentication required." });
        }

        var orders = await _orderService.GetUserOrdersAsync(userId, cancellationToken);
        return Ok(new { data = orders.Select(Dtos.Payments.OrderDTO.FromEntity) });
    }

    [HttpGet("my-orders/{orderId}")]
    public async Task<IActionResult> GetUserOrder(Guid orderId, CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
        {
            return Unauthorized(new { error = "Authentication required." });
        }

        var order = await _orderService.GetUserOrderByIdAsync(orderId, userId, cancellationToken);
        if (order == null)
        {
            return NotFound(new { error = "Order not found." });
        }

        return Ok(new { data = Dtos.Payments.OrderDTO.FromEntity(order) });
    }

    private async Task HandleCheckoutSessionCompletedAsync(Event stripeEvent, CancellationToken cancellationToken)
    {
        var session = stripeEvent.Data.Object as Session;
        if (session == null)
        {
            Console.WriteLine("⚠️ Session object was null in checkout.session.completed event");
            return;
        }

        Console.WriteLine($"✅ Checkout session completed: {session.Id}, PaymentStatus: {session.PaymentStatus}");

        if (session.PaymentStatus != "paid")
        {
            Console.WriteLine($"⚠️ Session {session.Id} completed but payment status is {session.PaymentStatus}");
            return;
        }

        var userIdStr = session.Metadata?.GetValueOrDefault("userId");
        if (string.IsNullOrWhiteSpace(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
        {
            Console.WriteLine($"⚠️ No userId in metadata for session {session.Id}. Order not created.");
            return;
        }

        var productName = session.Metadata?.GetValueOrDefault("productName") 
                          ?? session.Metadata?.GetValueOrDefault("productType") 
                          ?? "device";
        var productType = session.Metadata?.GetValueOrDefault("productType") ?? "device";
        var quantity = 1;
        if (int.TryParse(session.Metadata?.GetValueOrDefault("quantity"), out var parsedQty))
        {
            quantity = parsedQty;
        }

        // Check if order already exists (idempotency)
        var existingOrder = await _orderService.GetOrderByStripeSessionIdAsync(session.Id, cancellationToken);
        if (existingOrder != null)
        {
            Console.WriteLine($"ℹ️ Order already exists for session {session.Id}: {existingOrder.Id}");
            if (existingOrder.Status != "paid")
            {
                await _orderService.MarkOrderAsPaidAsync(session.Id, session.PaymentIntentId, cancellationToken);
                Console.WriteLine($"✅ Order {existingOrder.Id} marked as paid");
            }
            return;
        }

        var customerEmail = session.CustomerDetails?.Email ?? session.CustomerEmail;
        var customerName = session.CustomerDetails?.Name;
        var shippingAddress = session.CustomerDetails?.Address != null
            ? $"{session.CustomerDetails.Address.Line1}, {session.CustomerDetails.Address.City}, {session.CustomerDetails.Address.Country}"
            : null;

        var order = await _orderService.CreateOrderAsync(
            userId,
            session.Id,
            productName,
            productType,
            quantity,
            session.Currency?.ToUpperInvariant() ?? "EUR",
            session.AmountTotal ?? 0,
            customerEmail,
            customerName,
            cancellationToken
        );

        await _orderService.MarkOrderAsPaidAsync(session.Id, session.PaymentIntentId, cancellationToken);

        Console.WriteLine($"✅ Order created and marked as paid: {order.Id} for user {userId}");
    }

    private async Task HandleCheckoutSessionExpiredAsync(Event stripeEvent, CancellationToken cancellationToken)
    {
        var session = stripeEvent.Data.Object as Session;
        if (session == null) return;

        Console.WriteLine($"⏰ Checkout session expired: {session.Id}");

        var order = await _orderService.GetOrderByStripeSessionIdAsync(session.Id, cancellationToken);
        if (order != null && order.Status == "pending")
        {
            await _orderService.MarkOrderAsFailedAsync(session.Id, cancellationToken);
            Console.WriteLine($"❌ Order {order.Id} marked as failed (session expired)");
        }
    }

    private async Task HandleCheckoutSessionPaymentFailedAsync(Event stripeEvent, CancellationToken cancellationToken)
    {
        var session = stripeEvent.Data.Object as Session;
        if (session == null) return;

        Console.WriteLine($"❌ Checkout session payment failed: {session.Id}");

        var order = await _orderService.GetOrderByStripeSessionIdAsync(session.Id, cancellationToken);
        if (order != null && order.Status == "pending")
        {
            await _orderService.MarkOrderAsFailedAsync(session.Id, cancellationToken);
            Console.WriteLine($"❌ Order {order.Id} marked as failed (payment failed)");
        }
    }
}
