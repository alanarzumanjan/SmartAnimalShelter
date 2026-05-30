using System.Text.RegularExpressions;
using Data;
using Dtos;
using Microsoft.EntityFrameworkCore;
using Models;
using Services.Redis;

namespace Services;

public sealed class MeasurementService
{
    private readonly AppDbContext _db;
    private readonly IRedisService _redis;
    private readonly ILogger<MeasurementService> _logger;

    private const int HardCap = 5000;
    private static readonly TimeSpan LatestCacheTtl = TimeSpan.FromMinutes(5);

    public MeasurementService(AppDbContext db, IRedisService redis, ILogger<MeasurementService> logger)
    {
        _db = db;
        _redis = redis;
        _logger = logger;
    }

    public static string NormalizeMac(string mac)
    {
        if (string.IsNullOrWhiteSpace(mac))
            return mac ?? string.Empty;
        var hex = new string(mac.Where(char.IsLetterOrDigit).ToArray()).ToUpperInvariant();
        if (hex.Length != 12)
            return mac.Trim();
        return string.Join(":", Enumerable.Range(0, 6).Select(i => hex.Substring(i * 2, 2)));
    }

    public static bool IsValidMac(string mac) =>
        Regex.IsMatch(mac, "^[0-9A-F]{2}(:[0-9A-F]{2}){5}$");

    private static DateTime NormalizeToUtc(DateTime dt) => dt.Kind switch
    {
        DateTimeKind.Utc => dt,
        DateTimeKind.Local => dt.ToUniversalTime(),
        _ => DateTime.SpecifyKind(dt, DateTimeKind.Utc)
    };


    // Verifies device API key, upserts device LastSeenAt, persists measurement, updates Redis cache.
    // Returns the saved DTO or throws on auth/ownership failure.

    public async Task<MeasurementIngestResult> IngestAsync(
        string mac, string rawApiKey, MeasurementInDTO request, CancellationToken ct = default)
    {
        var link = await _db.DeviceUsers.FirstOrDefaultAsync(x => x.DeviceId == mac, ct);
        if (link == null)
            return MeasurementIngestResult.Unauthorized("Device is not enrolled (no device-user link).");

        if (string.IsNullOrWhiteSpace(link.ApiKeyHash) ||
            !BCrypt.Net.BCrypt.Verify(rawApiKey, link.ApiKeyHash))
            return MeasurementIngestResult.Unauthorized("Invalid device key.");

        var userId = link.UserId;

        var device = await _db.Devices.FirstOrDefaultAsync(d => d.DeviceId == mac, ct);
        if (device == null)
        {
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
            if (device.UserId != userId)
                return MeasurementIngestResult.Forbidden("Device ownership mismatch.");
            device.LastSeenAt = DateTime.UtcNow;
        }

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
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Measurement saved: device={Mac}, userId={UserId}, co2={CO2}, ts={Ts:o}",
            mac, userId, request.CO2, ts);

        var dto = MeasurementOutDTO.FromEntity(entity);
        await _redis.SetAsync($"device:latest:{mac}", dto, LatestCacheTtl);

        return MeasurementIngestResult.Ok(dto);
    }

    public async Task<(int total, IReadOnlyList<MeasurementOutDTO> items)> GetByDeviceAsync(
        string mac, DateTime? from, DateTime? to, int limit, int offset, CancellationToken ct = default)
    {
        limit = NormalizeLimit(limit);
        offset = Math.Max(0, offset);

        var query = _db.Measurements.AsNoTracking().Where(m => m.DeviceId == mac);
        query = ApplyDateRange(query, from, to);
        query = query.OrderByDescending(m => m.Timestamp);

        var total = await query.CountAsync(ct);
        var items = await query.Skip(offset).Take(limit).ToListAsync(ct);
        return (total, items.Select(MeasurementOutDTO.FromEntity).ToList());
    }

    public async Task<(int total, IReadOnlyList<MeasurementOutDTO> items)> GetByLinkAsync(
        Guid deviceUsersId, int limit, int offset, CancellationToken ct = default)
    {
        limit = Math.Clamp(limit, 1, 1000);
        offset = Math.Max(0, offset);

        var query = _db.Measurements.AsNoTracking()
            .Where(m => m.DeviceUserId == deviceUsersId)
            .OrderByDescending(m => m.Timestamp);

        var total = await query.CountAsync(ct);
        var items = await query.Skip(offset).Take(limit).ToListAsync(ct);
        return (total, items.Select(MeasurementOutDTO.FromEntity).ToList());
    }

    public async Task<(int total, IReadOnlyList<MeasurementOutDTO> items)> GetRecentAsync(
        int limit, int offset, CancellationToken ct = default)
    {
        limit = Math.Clamp(limit, 1, 1000);
        offset = Math.Max(0, offset);

        var query = _db.Measurements.AsNoTracking().OrderByDescending(m => m.Timestamp);
        var total = await query.CountAsync(ct);
        var items = await query.Skip(offset).Take(limit).ToListAsync(ct);
        return (total, items.Select(MeasurementOutDTO.FromEntity).ToList());
    }

    public async Task<MeasurementOutDTO?> GetLatestByDeviceAsync(string mac, CancellationToken ct = default)
    {
        var cached = await _redis.GetAsync<MeasurementOutDTO>($"device:latest:{mac}");
        if (cached != null)
            return cached;

        var item = await _db.Measurements.AsNoTracking()
            .Where(m => m.DeviceId == mac)
            .OrderByDescending(m => m.Timestamp)
            .FirstOrDefaultAsync(ct);

        if (item == null)
            return null;

        var dto = MeasurementOutDTO.FromEntity(item);
        await _redis.SetAsync($"device:latest:{mac}", dto, LatestCacheTtl);
        return dto;
    }

    public async Task<(int total, IReadOnlyList<MeasurementOutDTO> items)> GetByUserAsync(
        Guid userId, DateTime? from, DateTime? to, int limit, int offset, CancellationToken ct = default)
    {
        limit = NormalizeLimit(limit);
        offset = Math.Max(0, offset);

        var query = _db.Measurements.AsNoTracking().Where(m => m.UserId == userId);
        query = ApplyDateRange(query, from, to);
        query = query.OrderByDescending(m => m.Timestamp);

        var total = await query.CountAsync(ct);
        var items = await query.Skip(offset).Take(limit).ToListAsync(ct);
        return (total, items.Select(MeasurementOutDTO.FromEntity).ToList());
    }

    public async Task<Device?> GetDeviceByMacAsync(string mac, CancellationToken ct = default) =>
        await _db.Devices.AsNoTracking().FirstOrDefaultAsync(d => d.DeviceId == mac, ct);

    public async Task<DeviceUser?> GetLinkByIdAsync(Guid id, CancellationToken ct = default) =>
        await _db.DeviceUsers.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);

    private static int NormalizeLimit(int limit) =>
        limit <= 0 ? HardCap : Math.Clamp(limit, 1, HardCap);

    private static IQueryable<Measurement> ApplyDateRange(
        IQueryable<Measurement> q, DateTime? from, DateTime? to)
    {
        if (from.HasValue)
            q = q.Where(m => m.Timestamp >= DateTime.SpecifyKind(from.Value, DateTimeKind.Utc));
        if (to.HasValue)
            q = q.Where(m => m.Timestamp <= DateTime.SpecifyKind(to.Value, DateTimeKind.Utc));
        return q;
    }
}

// Result discriminated union for ingest - avoids exceptions for auth failures
public sealed class MeasurementIngestResult
{
    public enum ResultKind { Success, Unauthorized, Forbidden }

    public ResultKind Kind { get; private init; }
    public string? ErrorMessage { get; private init; }
    public MeasurementOutDTO? Data { get; private init; }

    public bool IsSuccess => Kind == ResultKind.Success;

    public static MeasurementIngestResult Ok(MeasurementOutDTO dto) =>
        new() { Kind = ResultKind.Success, Data = dto };

    public static MeasurementIngestResult Unauthorized(string msg) =>
        new() { Kind = ResultKind.Unauthorized, ErrorMessage = msg };

    public static MeasurementIngestResult Forbidden(string msg) =>
        new() { Kind = ResultKind.Forbidden, ErrorMessage = msg };
}
