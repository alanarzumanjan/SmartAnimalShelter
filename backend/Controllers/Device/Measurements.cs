using System.Security.Claims;
using Data;
using Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Services;

namespace Controllers;

[ApiController]
[Route("/")]
[Produces("application/json")]
public class MeasurementsController : ControllerBase
{
    private readonly MeasurementService _measurementService;
    private readonly ILogger<MeasurementsController> _logger;

    // SCD41 hardware minimum interval is ~5 seconds per measurement
    private static readonly TimeSpan IotRateWindow = TimeSpan.FromSeconds(10);
    private const int IotRateLimit = 2;

    public MeasurementsController(MeasurementService measurementService, ILogger<MeasurementsController> logger)
    {
        _measurementService = measurementService;
        _logger = logger;
    }

    private Guid? GetCurrentUserId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    private bool IsAdmin() => User.IsInRole("admin");

    [HttpPost("measurements")]
    public async Task<IActionResult> Ingest([FromBody] MeasurementInDTO? request, CancellationToken ct)
    {
        if (request == null)
            return BadRequest(new { error = "Body is required." });

        var errors = new Dictionary<string, string>();
        if (string.IsNullOrWhiteSpace(request.DeviceId))
            errors["deviceId"] = "DeviceId (MAC) is required.";
        if (request.CO2 <= 0 || request.CO2 > 10_000)
            errors["co2"] = "CO2 value is invalid.";
        if (errors.Count > 0)
            return BadRequest(new { errors });

        if (!Request.Headers.TryGetValue("X-Api-Key", out var rawKey) || string.IsNullOrWhiteSpace(rawKey))
            return Unauthorized(new { error = "X-Api-Key is required." });

        var mac = MeasurementService.NormalizeMac(request.DeviceId!);
        if (!MeasurementService.IsValidMac(mac))
            return BadRequest(new { error = "Invalid MAC format. Use AA:BB:CC:DD:EE:FF." });

        var result = await _measurementService.IngestAsync(mac, rawKey.ToString(), request, ct);

        return result.Kind switch
        {
            MeasurementIngestResult.ResultKind.Unauthorized => Unauthorized(new { error = result.ErrorMessage }),
            MeasurementIngestResult.ResultKind.Forbidden => StatusCode(403, new { error = result.ErrorMessage }),
            _ => Ok(new { message = $"Measurement saved: device={mac}", data = result.Data })
        };
    }

    [HttpGet("measurements/{deviceId}")]
    [Authorize]
    public async Task<IActionResult> GetByDevice(
        string deviceId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int limit = 0,
        [FromQuery] int offset = 0,
        CancellationToken ct = default)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
            return Unauthorized();

        var mac = MeasurementService.NormalizeMac(deviceId);

        if (!IsAdmin())
        {
            var device = await _measurementService.GetDeviceByMacAsync(mac, ct);
            if (device == null)
                return NotFound(new { error = "Device not found." });
            if (device.UserId != currentUserId)
                return Forbid();
        }

        var (total, items) = await _measurementService.GetByDeviceAsync(mac, from, to, limit, offset, ct);
        return Ok(new { total, limit, offset, from, to, data = items });
    }

    [HttpGet("measurements/by-link/{deviceUsersId:guid}")]
    [Authorize]
    public async Task<IActionResult> GetByLink(
        Guid deviceUsersId,
        [FromQuery] int limit = 50,
        [FromQuery] int offset = 0,
        CancellationToken ct = default)
    {
        if (deviceUsersId == Guid.Empty)
            return BadRequest(new { errors = new { deviceUsersId = "Required" } });

        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
            return Unauthorized();

        if (!IsAdmin())
        {
            var link = await _measurementService.GetLinkByIdAsync(deviceUsersId, ct);
            if (link == null)
                return NotFound(new { error = "Link not found." });
            if (link.UserId != currentUserId)
                return Forbid();
        }

        var (total, items) = await _measurementService.GetByLinkAsync(deviceUsersId, limit, offset, ct);
        return Ok(new { total, limit, offset, data = items });
    }

    [HttpGet("measurements/recent")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> GetRecent(
        [FromQuery] int limit = 50,
        [FromQuery] int offset = 0,
        CancellationToken ct = default)
    {
        var (total, items) = await _measurementService.GetRecentAsync(limit, offset, ct);
        return Ok(new { total, limit, offset, data = items });
    }

    [HttpGet("measurements/{deviceId}/latest")]
    [Authorize]
    public async Task<IActionResult> GetLatestByDevice(string deviceId, CancellationToken ct)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
            return Unauthorized();

        var mac = MeasurementService.NormalizeMac(deviceId);

        if (!IsAdmin())
        {
            var device = await _measurementService.GetDeviceByMacAsync(mac, ct);
            if (device == null)
                return NotFound(new { error = "Device not found." });
            if (device.UserId != currentUserId)
                return Forbid();
        }

        var dto = await _measurementService.GetLatestByDeviceAsync(mac, ct);
        if (dto == null)
            return NotFound(new { error = "No measurements yet." });

        return Ok(new { data = dto });
    }

    [HttpGet("measurements/user/{userId:guid}")]
    [Authorize]
    public async Task<IActionResult> GetByUser(
        Guid userId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int limit = 0,
        [FromQuery] int offset = 0,
        CancellationToken ct = default)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
            return Unauthorized();
        if (currentUserId != userId && !IsAdmin())
            return Forbid();

        var (total, items) = await _measurementService.GetByUserAsync(userId, from, to, limit, offset, ct);
        return Ok(new { total, limit, offset, from, to, data = items });
    }
}
