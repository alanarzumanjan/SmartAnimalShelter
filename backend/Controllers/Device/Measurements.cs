using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using Models;
using Dtos;
using Data;

namespace Controllers;

[ApiController]
[Route("/")]
[Produces("application/json")]
public class MeasurementsController : ControllerBase
{
    private readonly AppDbContext _db;

    public MeasurementsController(AppDbContext db) => _db = db;

    private static string NormalizeMac(string mac)
    {
        if (string.IsNullOrWhiteSpace(mac)) return mac ?? string.Empty;
        var hex = new string(mac.Where(char.IsLetterOrDigit).ToArray()).ToUpperInvariant();
        if (hex.Length != 12) return mac.Trim();
        return string.Join(":", Enumerable.Range(0, 6).Select(i => hex.Substring(i * 2, 2)));
    }

    private static bool IsValidMac(string mac) =>
        Regex.IsMatch(mac, "^[0-9A-F]{2}(:[0-9A-F]{2}){5}$");

    [HttpPost("measurements")]
    public async Task<IActionResult> Ingest([FromBody] MeasurementInDTO request)
    {
        if (request == null)
            return BadRequest(new { error = "Body is required." });

        // validate body
        var errors = new Dictionary<string, string>();
        if (string.IsNullOrWhiteSpace(request.DeviceId)) errors["deviceId"] = "DeviceId (MAC) is required.";
        if (request.CO2 <= 0 || request.CO2 > 10_000) errors["co2"] = "CO2 value is invalid.";
        if (errors.Count > 0) return BadRequest(new { errors });

        // validate header key
        if (!Request.Headers.TryGetValue("X-Api-Key", out var rawKey) || string.IsNullOrWhiteSpace(rawKey))
            return Unauthorized(new { error = "X-Api-Key is required." });

        var mac = NormalizeMac(request.DeviceId!);
        if (!IsValidMac(mac))
            return BadRequest(new { error = "Invalid MAC format. Use AA:BB:CC:DD:EE:FF." });

        try
        {
            // 1) Find link for this device (we don't trust UserId from body)
            var link = await _db.DeviceUsers.FirstOrDefaultAsync(x => x.DeviceId == mac);
            if (link == null)
                return Unauthorized(new { error = "Device is not enrolled (no device-user link)." });

            if (string.IsNullOrWhiteSpace(link.ApiKeyHash) ||
                !BCrypt.Net.BCrypt.Verify(rawKey.ToString(), link.ApiKeyHash))
                return Unauthorized(new { error = "Invalid device key." });

            var userId = link.UserId;

            // 2) Ensure device exists (optional safety)
            var device = await _db.Devices.FirstOrDefaultAsync(d => d.DeviceId == mac);
            if (device == null)
            {
                // Create device bound to the user from link
                device = new Device
                {
                    Id = Guid.NewGuid(),
                    DeviceId = mac,
                    Name = "Auto-registered device",
                    Location = "Unknown",
                    RegisteredAt = DateTime.UtcNow,
                    UserId = userId,
                    LastSeenAt = DateTime.UtcNow
                };
                _db.Devices.Add(device);
            }
            else
            {
                // extra safety: ensure ownership matches the link
                if (device.UserId != userId)
                    return StatusCode(403, new { error = "Device ownership mismatch." });

                device.LastSeenAt = DateTime.UtcNow;
            }

            // 3) Save measurement
            var ts = (request.Timestamp ?? DateTime.UtcNow).ToUniversalTime();

            var entity = new Measurement
            {
                Id = Guid.NewGuid(),
                DeviceId = mac,
                UserId = userId,
                DeviceUserId = link.Id,
                CO2 = request.CO2,
                Temperature = request.Temperature,
                Humidity = request.Humidity,
                Timestamp = ts
            };

            _db.Measurements.Add(entity);
            await _db.SaveChangesAsync();

            var message = $"> Measurement saved: device={mac}, userId={userId}, link={link.Id}, co2={request.CO2}, ts={ts:o}";
            Console.WriteLine(message);

            return Ok(new { message, data = MeasurementOutDTO.FromEntity(entity) });
        }
        catch (DbUpdateException dbex)
        {
            Console.WriteLine($"❌ DB error on ingest: {dbex.Message}");
            return StatusCode(500, new { error = "Database error while saving measurement." });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Failed to ingest measurement: {ex.Message}");
            return StatusCode(500, new { error = "Failed to ingest measurement." });
        }
    }

    [HttpGet("measurements/{deviceId}")]
public async Task<IActionResult> GetByDevice(
    string deviceId,
    [FromQuery] DateTime? from = null,
    [FromQuery] DateTime? to = null,
    [FromQuery] int limit = 0,          // 0 = "no limit" (but capped)
    [FromQuery] int offset = 0)
{
    try
    {
        offset = Math.Max(0, offset);

        // safety cap: "no limit" is still capped
        const int HARD_CAP = 1000000;
        if (limit <= 0) limit = HARD_CAP;
        limit = Math.Clamp(limit, 1, HARD_CAP);

        var mac = NormalizeMac(deviceId);

        var query = _db.Measurements
            .AsNoTracking()
            .Where(m => m.DeviceId == mac);

        if (from.HasValue)
        {
            var f = DateTime.SpecifyKind(from.Value, DateTimeKind.Utc);
            query = query.Where(m => m.Timestamp >= f);
        }

        if (to.HasValue)
        {
            var t = DateTime.SpecifyKind(to.Value, DateTimeKind.Utc);
            query = query.Where(m => m.Timestamp <= t);
        }

        query = query.OrderByDescending(m => m.Timestamp);

        var total = await query.CountAsync();
        var items = await query.Skip(offset).Take(limit).ToListAsync();

        return Ok(new
        {
            total,
            limit,
            offset,
            from,
            to,
            data = items.Select(MeasurementOutDTO.FromEntity)
        });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ Failed to fetch by device: {ex.Message}");
        return StatusCode(500, new { error = "Failed to fetch measurements." });
    }
}


    [HttpGet("measurements/by-link/{deviceUsersId:guid}")]
    public async Task<IActionResult> GetByLink(Guid deviceUsersId, [FromQuery] int limit = 50, [FromQuery] int offset = 0)
    {
        if (deviceUsersId == Guid.Empty)
            return BadRequest(new { errors = new { deviceUsersId = "Required" } });

        try
        {
            limit = Math.Clamp(limit, 1, 1000);
            offset = Math.Max(0, offset);

            var query = _db.Measurements
                .AsNoTracking()
                .Where(m => m.DeviceUserId == deviceUsersId)
                .OrderByDescending(m => m.Timestamp);

            var total = await query.CountAsync();
            var items = await query.Skip(offset).Take(limit).ToListAsync();

            return Ok(new
            {
                total,
                limit,
                offset,
                data = items.Select(MeasurementOutDTO.FromEntity)
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Failed to fetch by link: {ex.Message}");
            return StatusCode(500, new { error = "Failed to fetch measurements." });
        }
    }

    [HttpGet("measurements/recent")]
    public async Task<IActionResult> GetRecent([FromQuery] int limit = 50, [FromQuery] int offset = 0)
    {
        try
        {
            limit = Math.Clamp(limit, 1, 1000);
            offset = Math.Max(0, offset);

            var query = _db.Measurements
                .AsNoTracking()
                .OrderByDescending(m => m.Timestamp);

            var total = await query.CountAsync();
            var items = await query.Skip(offset).Take(limit).ToListAsync();

            return Ok(new
            {
                total,
                limit,
                offset,
                data = items.Select(MeasurementOutDTO.FromEntity)
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Failed to fetch recent: {ex.Message}");
            return StatusCode(500, new { error = "Failed to fetch measurements." });
        }
    }

    [HttpGet("measurements/{deviceId}/latest")]
    public async Task<IActionResult> GetLatestByDevice(string deviceId)
    {
        try
        {
            var mac = NormalizeMac(deviceId);

            var item = await _db.Measurements
                .AsNoTracking()
                .Where(m => m.DeviceId == mac)
                .OrderByDescending(m => m.Timestamp)
                .FirstOrDefaultAsync();

            if (item == null)
                return NotFound(new { error = "No measurements yet." });

            return Ok(new { data = MeasurementOutDTO.FromEntity(item) });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Failed to get latest measurement: {ex.Message}");
            return StatusCode(500, new { error = "Failed to get latest measurement." });
        }
    }
}