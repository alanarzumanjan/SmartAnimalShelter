using System.Security.Claims;
using System.Security.Cryptography;
using System.Text.RegularExpressions;
using Data;
using Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Models;
using Services;

namespace Controllers;

[ApiController]
[Route("/device-users")]
[Produces("application/json")]
public class DeviceUsersController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly UserEmailService _userEmailService;

    public DeviceUsersController(AppDbContext db, UserEmailService userEmailService)
    {
        _db = db;
        _userEmailService = userEmailService;
    }

    private Guid? GetCurrentUserId()
    {
        var val = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(val, out var id) ? id : null;
    }

    private bool IsAdmin() =>
        User.FindFirstValue(ClaimTypes.Role) == UserRole.admin.ToString();

    private static string NormalizeMac(string mac)
    {
        var hex = new string((mac ?? "").Where(c => Uri.IsHexDigit(c)).ToArray()).ToUpperInvariant();
        if (hex.Length != 12)
            return (mac ?? "").Trim();
        return string.Join(":", Enumerable.Range(0, 6).Select(i => hex.Substring(i * 2, 2)));
    }

    private static bool IsValidMac(string mac) =>
        Regex.IsMatch(mac, "^[0-9A-F]{2}(:[0-9A-F]{2}){5}$");

    private static DateTime UtcNow() => DateTime.UtcNow;

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] DeviceLoginRequest req)
    {
        if (req is null)
            return BadRequest(new { error = "Body is required." });

        var mac = NormalizeMac(req.Mac);
        if (!IsValidMac(mac))
            return BadRequest(new { error = "Invalid MAC format. Use AA:BB:CC:DD:EE:FF." });

        var email = (req.Email ?? "").Trim().ToLower();
        var password = req.Password ?? "";

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
            return BadRequest(new { error = "Email and password are required." });

        var user = await _userEmailService.FindByEmailAsync(email);

        if (user?.PasswordHash == null || !BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
            return Unauthorized(new { error = "Invalid credentials." });

        var device = await _db.Devices.FirstOrDefaultAsync(d => d.DeviceId == mac);
        if (device == null)
        {
            device = new Device
            {
                Id = Guid.NewGuid(),
                DeviceId = mac,
                Name = "IoT Device",
                Location = "Unknown",
                RegisteredAt = UtcNow(),
                UserId = user.Id
            };
            _db.Devices.Add(device);
            await _db.SaveChangesAsync();
        }
        else
        {
            if (device.UserId != user.Id)
                return StatusCode(403, new { error = "Device is owned by another user." });

            device.LastSeenAt = UtcNow();
            await _db.SaveChangesAsync();
        }

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
                    CreatedAt = UtcNow()
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

        // ✅ Key already exists — don't issue a new one
        return Ok(new DeviceLoginResponse
        {
            DeviceUsersId = link.Id,
            DeviceId = device.Id,
            Mac = mac,
            DeviceKey = null,
            KeyIssued = false
        });
    }

    [HttpPost("enroll")]
    [Authorize]
    public async Task<IActionResult> Enroll([FromBody] DeviceUsersEnrollRequest req)
    {
        if (req is null)
            return BadRequest(new { error = "Body is required." });
        if (req.UserId == Guid.Empty)
            return BadRequest(new { error = "UserId is required." });
        if (string.IsNullOrWhiteSpace(req.DeviceId))
            return BadRequest(new { error = "DeviceId is required." });

        var currentUserId = GetCurrentUserId();
        if (currentUserId is null)
            return Unauthorized(new { error = "Invalid user token." });

        // Users can only enroll themselves; admins can enroll anyone
        if (req.UserId != currentUserId.Value && !IsAdmin())
            return Forbid();

        var mac = NormalizeMac(req.DeviceId);
        if (!IsValidMac(mac))
            return BadRequest(new { error = "Invalid MAC format. Use AA:BB:CC:DD:EE:FF." });

        var device = await _db.Devices.FirstOrDefaultAsync(d => d.DeviceId == mac);
        if (device == null)
        {
            device = new Device
            {
                Id = Guid.NewGuid(),
                DeviceId = mac,
                Name = "Auto-registered device",
                Location = "Unknown",
                RegisteredAt = UtcNow(),
                UserId = req.UserId
            };
            _db.Devices.Add(device);
            await _db.SaveChangesAsync();
        }
        else
        {
            // If device exists, user must own it (or be admin) to enroll another user to it
            if (device.UserId != currentUserId.Value && !IsAdmin())
                return Forbid();
        }

        var existing = await _db.DeviceUsers.FirstOrDefaultAsync(x => x.DeviceId == mac && x.UserId == req.UserId);
        if (existing != null)
            return Conflict(new { error = "Already enrolled for this user." });

        var rawKey = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
        var hash = BCrypt.Net.BCrypt.HashPassword(rawKey);

        var du = new DeviceUser
        {
            Id = Guid.NewGuid(),
            DeviceId = mac,
            UserId = req.UserId,
            ApiKeyHash = hash,
            CreatedAt = UtcNow()
        };

        _db.DeviceUsers.Add(du);
        await _db.SaveChangesAsync();

        return Ok(new DeviceUsersEnrollResponse { DeviceUsersId = du.Id, DeviceKey = rawKey });
    }
}
