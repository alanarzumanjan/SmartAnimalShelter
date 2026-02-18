using Microsoft.AspNetCore.Mvc;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using Models;
using Data;
using Dtos;

namespace Controllers;

[ApiController]
[Route("/device-users")]
[Produces("application/json")]
public class DeviceUsersController : ControllerBase
{
    private readonly AppDbContext _db;
    public DeviceUsersController(AppDbContext db) => _db = db;

    private static string NormalizeMac(string mac)
    {
        var hex = new string((mac ?? "").Where(c => Uri.IsHexDigit(c)).ToArray()).ToUpperInvariant();
        if (hex.Length != 12) return (mac ?? "").Trim();
        return string.Join(":", Enumerable.Range(0, 6).Select(i => hex.Substring(i * 2, 2)));
    }

    private static bool IsValidMac(string mac) =>
        Regex.IsMatch(mac, "^[0-9A-F]{2}(:[0-9A-F]{2}){5}$");
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] DeviceLoginRequest req)
    {
        if (req is null) return BadRequest(new { error = "Body is required." });

        var mac = NormalizeMac(req.Mac);
        if (!IsValidMac(mac)) return BadRequest(new { error = "Invalid MAC format. Use AA:BB:CC:DD:EE:FF." });

        var username = (req.Username ?? "").Trim();
        var password = req.Password ?? "";

        if (username.Length == 0 || password.Length == 0)
            return BadRequest(new { error = "Username/password are required." });

        // 1) Validate user credentials
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Username == username);
        if (user?.PasswordHash == null || !BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
            return Unauthorized(new { error = "Invalid credentials." });

        // 2) Ensure device exists and is linked to this user
        var device = await _db.Devices.FirstOrDefaultAsync(d => d.DeviceId == mac);
        if (device == null)
        {
            device = new Device
            {
                Id = Guid.NewGuid(),
                DeviceId = mac,
                Name = "ESP32",
                Location = "Unknown",
                RegisteredAt = DateTime.UtcNow,
                UserId = user.Id
            };
            _db.Devices.Add(device);
            await _db.SaveChangesAsync();
        }
        else
        {
            if (device.UserId != user.Id)
                return Forbid("Device is owned by another user.");

            device.LastSeenAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }

        // 3) Ensure DeviceUser link exists
        var link = await _db.DeviceUsers.FirstOrDefaultAsync(x => x.DeviceId == mac && x.UserId == user.Id); 

        if (link == null || string.IsNullOrWhiteSpace(link.ApiKeyHash))
        {
            var rawKey = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
            var hash = BCrypt.Net.BCrypt.HashPassword(rawKey);

            if (link == null)
            {
                link = new DeviceUser
                {
                    Id = Guid.NewGuid(),
                    DeviceId = mac,
                    UserId = user.Id,
                    ApiKeyHash = hash,
                    CreatedAt = DateTime.UtcNow
                };
                _db.DeviceUsers.Add(link);
            }
            else
            {
                link.ApiKeyHash = hash;
            }

            await _db.SaveChangesAsync();

            return Ok(new DeviceLoginResponse
            {
                DeviceUsersId = link.Id,
                DeviceId = device.Id,
                Mac = mac,
                DeviceKey = rawKey,
                KeyIssued = true
            });
        }

        return Ok(new DeviceLoginResponse { DeviceUsersId = link.Id, DeviceId = device.Id, Mac = mac, DeviceKey = null, KeyIssued = false });
    }

    [HttpPost("enroll")]
    public async Task<IActionResult> Enroll([FromBody] DeviceUsersEnrollRequest req)
    {
        if (req is null) return BadRequest(new { error = "Body is required." });
        if (req.UserId == Guid.Empty) return BadRequest(new { error = "UserId is required." });
        if (string.IsNullOrWhiteSpace(req.DeviceId)) return BadRequest(new { error = "DeviceId is required." });

        var mac = NormalizeMac(req.DeviceId);
        if (!IsValidMac(mac)) return BadRequest(new { error = "Invalid MAC format. Use AA:BB:CC:DD:EE:FF." });

        var device = await _db.Devices.FirstOrDefaultAsync(d => d.DeviceId == mac);
        if (device == null)
        {
            device = new Device
            {
                Id = Guid.NewGuid(),
                DeviceId = mac,
                Name = "Auto-registered device",
                Location = "Unknown",
                RegisteredAt = DateTime.UtcNow,
                UserId = req.UserId
            };
            _db.Devices.Add(device);
            await _db.SaveChangesAsync();
        }

        var existing = await _db.DeviceUsers.FirstOrDefaultAsync(x => x.DeviceId == mac && x.UserId == req.UserId);
        if (existing != null) return Conflict(new { error = "Already enrolled for this user." });

        var rawKey = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
        var hash = BCrypt.Net.BCrypt.HashPassword(rawKey);

        var du = new DeviceUser
        {
            Id = Guid.NewGuid(),
            DeviceId = mac,
            UserId = req.UserId,
            ApiKeyHash = hash,
            CreatedAt = DateTime.UtcNow
        };

        _db.DeviceUsers.Add(du);
        await _db.SaveChangesAsync();

        return Ok(new DeviceUsersEnrollResponse { DeviceUsersId = du.Id, DeviceKey = rawKey });
    }
}