using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using Models;
using Dtos;
using Data;
using Services.Redis;

namespace Controllers;

[ApiController]
[Route("/")]
[Produces("application/json")]
public class MeasurementsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly RedisService _redis;

    // SCD41 hardware minimum interval is ~5 seconds per measurement
    private static readonly TimeSpan IotRateWindow = TimeSpan.FromSeconds(10);
    private const int IotRateLimit = 2;

    public MeasurementsController(AppDbContext db, RedisService redis)
    {
        _db = db;
        _redis = redis;
    }

    private static string NormalizeMac(string mac)
    {
        if (string.IsNullOrWhiteSpace(mac)) return mac ?? string.Empty;
        var hex = new string(mac.Where(char.IsLetterOrDigit).ToArray()).ToUpperInvariant();
        if (hex.Length != 12) return mac.Trim();
        return string.Join(":", Enumerable.Range(0, 6).Select(i => hex.Substring(i * 2, 2)));
    }

    private static bool IsValidMac(string mac) =>
        Regex.IsMatch(mac, "^[0-9A-F]{2}(:[0-9A-F]{2}){5}$");

    private static DateTime NormalizeToUtc(DateTime dateTime) =>
        dateTime.Kind switch
        {
            DateTimeKind.Utc => dateTime,
            DateTimeKind.Local => dateTime.ToUniversalTime(),
            _ => DateTime.SpecifyKind(dateTime, DateTimeKind.Utc)
        };

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

        // Rate limit per MAC — guards against a stuck device spamming the endpoint
        var allowed = await _redis.AllowRequestAsync($"ratelimit:iot:{mac}", IotRateLimit, IotRateWindow);
        if (!allowed)
            return StatusCode(429, new { error = "Too many requests. Device is sending data too fast." });

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
            var ts = NormalizeToUtc(request.Timestamp ?? DateTime.UtcNow);

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

            // Cache the latest reading so the dashboard doesn't hammer the DB
            await _redis.SetAsync($"device:latest:{mac}", MeasurementOutDTO.FromEntity(entity), TimeSpan.FromMinutes(5));

            return Ok(new { message, data = MeasurementOutDTO.FromEntity(entity) });
        }
        catch (DbUpdateException dbex)
        {
            var logMessage = $"> ❌ DB error on ingest: {dbex.Message}";
            Console.WriteLine(logMessage);
            return StatusCode(500, new { error = "Database error while saving measurement." });
        }
        catch (Exception ex)
        {
            var logMessage2 = $"> ❌ Failed to ingest measurement: {ex.Message}";
            Console.WriteLine(logMessage2);
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

            // Check Redis first — the dashboard polls this endpoint frequently
            var cached = await _redis.GetAsync<MeasurementOutDTO>($"device:latest:{mac}");
            if (cached != null)
                return Ok(new { data = cached, source = "cache" });

            var item = await _db.Measurements
                .AsNoTracking()
                .Where(m => m.DeviceId == mac)
                .OrderByDescending(m => m.Timestamp)
                .FirstOrDefaultAsync();

            if (item == null)
                return NotFound(new { error = "No measurements yet." });

            var dto = MeasurementOutDTO.FromEntity(item);
            await _redis.SetAsync($"device:latest:{mac}", dto, TimeSpan.FromMinutes(5));

            return Ok(new { data = dto, source = "db" });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Failed to get latest measurement: {ex.Message}");
            return StatusCode(500, new { error = "Failed to get latest measurement." });
        }
    }

    [HttpGet("measurements/user/{userId:guid}")]
    public async Task<IActionResult> GetByUser(
        Guid userId,
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        [FromQuery] int limit = 0,
        [FromQuery] int offset = 0)
    {
        try
        {
            offset = Math.Max(0, offset);
            const int HARD_CAP = 1000000;
            if (limit <= 0) limit = HARD_CAP;
            limit = Math.Clamp(limit, 1, HARD_CAP);

            var query = _db.Measurements
                .AsNoTracking()
                .Where(m => m.UserId == userId);

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
            Console.WriteLine($"❌ Failed to fetch user measurements: {ex.Message}");
            return StatusCode(500, new { error = "Failed to fetch measurements." });
        }
    }
}
