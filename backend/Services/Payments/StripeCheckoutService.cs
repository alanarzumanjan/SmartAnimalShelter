using Dtos;
using Stripe;
using Stripe.Checkout;

namespace Services.Payments;

public sealed class StripeCheckoutService
{
    private readonly StripeCheckoutOptions _options;

    public StripeCheckoutService(StripeCheckoutOptions options)
    {
        _options = options;
    }

    public bool IsConfigured => _options.IsConfigured;

    public StoreProductDTO GetStoreProduct() => new()
    {
        Name = _options.DeviceName,
        Description = _options.DeviceDescription,
        Currency = _options.Currency,
        UnitAmount = _options.DeviceUnitAmount,
        StripeEnabled = _options.IsConfigured
    };

    public async Task<CheckoutSessionDTO> CreateDeviceCheckoutSessionAsync(
        CreateCheckoutSessionDTO request,
        CancellationToken cancellationToken = default)
    {
        EnsureConfigured();

        var quantity = Math.Clamp(request.Quantity, 1, 25);
        var client = new StripeClient(_options.SecretKey);
        var sessionService = new SessionService(client);

        var metadata = new Dictionary<string, string>
        {
            ["productType"] = "device",
            ["productName"] = _options.DeviceName,
            ["quantity"] = quantity.ToString()
        };

        if (!string.IsNullOrWhiteSpace(request.UserId))
        {
            metadata["userId"] = request.UserId.Trim();
        }

        if (!string.IsNullOrWhiteSpace(request.CustomerName))
        {
            metadata["customerName"] = request.CustomerName.Trim();
        }

        var options = new SessionCreateOptions
        {
            Mode = "payment",
            SuccessUrl = $"{_options.FrontendBaseUrl}/store?checkout=success&session_id={{CHECKOUT_SESSION_ID}}",
            CancelUrl = $"{_options.FrontendBaseUrl}/store?checkout=cancelled",
            BillingAddressCollection = "required",
            CustomerEmail = string.IsNullOrWhiteSpace(request.CustomerEmail) ? null : request.CustomerEmail.Trim(),
            ClientReferenceId = string.IsNullOrWhiteSpace(request.UserId) ? null : request.UserId.Trim(),
            Locale = "auto",
            PhoneNumberCollection = new SessionPhoneNumberCollectionOptions
            {
                Enabled = true
            },
            AllowPromotionCodes = true,
            Metadata = metadata,
            LineItems =
            [
                new SessionLineItemOptions
                {
                    Quantity = quantity,
                    PriceData = new SessionLineItemPriceDataOptions
                    {
                        Currency = _options.Currency,
                        UnitAmount = _options.DeviceUnitAmount,
                        ProductData = new SessionLineItemPriceDataProductDataOptions
                        {
                            Name = _options.DeviceName,
                            Description = _options.DeviceDescription
                        }
                    }
                }
            ]
        };

        if (_options.AllowedShippingCountries.Count > 0)
        {
            options.ShippingAddressCollection = new SessionShippingAddressCollectionOptions
            {
                AllowedCountries = _options.AllowedShippingCountries.ToList()
            };
        }

        var session = await sessionService.CreateAsync(options, cancellationToken: cancellationToken);

        return new CheckoutSessionDTO
        {
            Id = session.Id,
            Url = session.Url ?? throw new InvalidOperationException("Stripe Checkout session URL was not returned."),
            PaymentStatus = session.PaymentStatus,
            Status = session.Status
        };
    }

    public async Task<CheckoutSessionStatusDTO> GetCheckoutSessionStatusAsync(
        string sessionId,
        CancellationToken cancellationToken = default)
    {
        EnsureConfigured();

        if (string.IsNullOrWhiteSpace(sessionId))
        {
            throw new ArgumentException("SessionId is required.", nameof(sessionId));
        }

        var client = new StripeClient(_options.SecretKey);
        var sessionService = new SessionService(client);
        var session = await sessionService.GetAsync(
            sessionId.Trim(),
            new SessionGetOptions(),
            cancellationToken: cancellationToken);

        var totalAmount = session.AmountTotal ?? 0;
        var quantity = 1;
        if (session.Metadata?.TryGetValue("quantity", out var rawQuantity) == true
            && int.TryParse(rawQuantity, out var parsedQuantity)
            && parsedQuantity > 0)
        {
            quantity = parsedQuantity;
        }

        return new CheckoutSessionStatusDTO
        {
            Id = session.Id,
            Status = session.Status,
            PaymentStatus = session.PaymentStatus,
            Currency = session.Currency ?? _options.Currency,
            AmountTotal = totalAmount,
            AmountSubtotal = session.AmountSubtotal ?? totalAmount,
            CustomerEmail = session.CustomerDetails?.Email ?? session.CustomerEmail,
            CustomerName = session.CustomerDetails?.Name,
            IsPaid = string.Equals(session.PaymentStatus, "paid", StringComparison.OrdinalIgnoreCase),
            Quantity = quantity,
            ProductName = _options.DeviceName
        };
    }

    private void EnsureConfigured()
    {
        if (!_options.IsConfigured)
        {
            throw new InvalidOperationException("Stripe is not configured. Set STRIPE_SECRET_KEY to enable checkout.");
        }
    }
}
