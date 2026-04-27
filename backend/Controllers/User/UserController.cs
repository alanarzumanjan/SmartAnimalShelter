using System.Security.Claims;
using Data;
using Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Models;
using Services;

namespace Controllers;

[ApiController]
[Route("users")]
public class UsersController : ControllerBase
{
    private readonly AppDbContext db;
    private readonly PasswordHashingService _passwordHashingService;
    private readonly UserEmailService _userEmailService;
    private readonly ILogger<UsersController> _logger;

    public UsersController(
        AppDbContext context,
        PasswordHashingService passwordHashingService,
        UserEmailService userEmailService,
        ILogger<UsersController> logger)
    {
        db = context;
        _passwordHashingService = passwordHashingService;
        _userEmailService = userEmailService;
        _logger = logger;
    }

    [HttpGet]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? role,
        [FromQuery] string? name,
        [FromQuery] string? email,
        [FromQuery] string? sort = "name",
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        if (page <= 0)
            page = 1;
        if (pageSize <= 0 || pageSize > 200)
            pageSize = 50;

        var query = db.Users.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(role) && Enum.TryParse<UserRole>(role, out var roleEnum))
            query = query.Where(u => u.Role == roleEnum);

        if (!string.IsNullOrWhiteSpace(name))
            query = query.Where(u => u.Username != null && u.Username.ToLower().Contains(name.ToLower()));

        // Note: email filtering on encrypted values must remain client-side or use a hash index.
        // For exam/demo purposes we materialize after role/name filter to keep it safe,
        // but we add pagination to prevent OOM on large tables.
        var totalCount = await query.CountAsync();

        var usersPage = await query
            .OrderBy(u => u.Username)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        if (!string.IsNullOrWhiteSpace(email))
            usersPage = usersPage
                .Where(u => EncryptionService.EmailMatchesEncryptedValue(u.Email, email))
                .ToList();

        foreach (var user in usersPage)
        {
            if (!string.IsNullOrWhiteSpace(user.Email))
            {
                try
                { user.Email = EncryptionService.Decrypt(user.Email) ?? user.Email; }
                catch { }
            }

            if (!string.IsNullOrWhiteSpace(user.Phone))
            {
                try
                { user.Phone = EncryptionService.Decrypt(user.Phone) ?? user.Phone; }
                catch { }
            }
        }

        usersPage = sort switch
        {
            "created" => usersPage.OrderByDescending(u => u.CreatedAt).ToList(),
            "email" => usersPage.OrderBy(u => u.Email ?? string.Empty).ToList(),
            _ => usersPage.OrderBy(u => u.Username).ToList()
        };

        _logger.LogInformation("> Admin fetched {Count} users (page {Page}, size {PageSize}, total {Total})", usersPage.Count, page, pageSize, totalCount);
        Console.WriteLine($"> Admin fetched {usersPage.Count} users (page {page}, size {pageSize}, total {totalCount})");

        return Ok(new
        {
            currentPage = page,
            pageSize,
            totalCount,
            totalPages = (int)Math.Ceiling(totalCount / (double)pageSize),
            users = usersPage
        });
    }

    [HttpPatch("{id}")]
    [Authorize]
    public async Task<IActionResult> Patch(Guid id, [FromBody] UserUpdateDto dto)
    {
        var currentUserIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(currentUserIdValue) || !Guid.TryParse(currentUserIdValue, out var currentUserId))
            return Unauthorized();

        if (currentUserId != id && !User.IsInRole("admin"))
            return Forbid();

        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
            return NotFound("User not found.");

        if (!string.IsNullOrWhiteSpace(dto.email))
        {
            var trimmedEmail = dto.email.Trim();
            string? encryptedEmail = EncryptionService.Encrypt(trimmedEmail);
            bool emailExists = await _userEmailService.EmailExistsAsync(trimmedEmail, id);
            if (emailExists)
                return BadRequest("Email is already taken.");

            user.Email = encryptedEmail ?? user.Email;
        }

        if (!string.IsNullOrWhiteSpace(dto.name))
            user.Username = dto.name;

        if (!string.IsNullOrWhiteSpace(dto.phone))
        {
            string? encryptedPhone = EncryptionService.Encrypt(dto.phone);
            user.Phone = encryptedPhone ?? user.Phone;
        }

        if (dto.address != null)
            user.Address = dto.address;

        if (!string.IsNullOrWhiteSpace(dto.role) && Enum.TryParse<UserRole>(dto.role, out var roleEnum))
            user.Role = roleEnum;

        using var transaction = await db.Database.BeginTransactionAsync();
        await db.SaveChangesAsync();
        await transaction.CommitAsync();

        return Ok("User updated.");
    }

    [HttpGet("{id}")]
    [Authorize]
    public async Task<IActionResult> GetById(Guid id)
    {
        var currentUserIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(currentUserIdValue) || !Guid.TryParse(currentUserIdValue, out var currentUserId))
            return Unauthorized();

        if (currentUserId != id && !User.IsInRole("admin"))
            return Forbid();

        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
            return NotFound("User not found.");

        try
        {
            if (!string.IsNullOrWhiteSpace(user.Email))
                user.Email = EncryptionService.Decrypt(user.Email) ?? user.Email;
        }
        catch { }

        try
        {
            if (!string.IsNullOrWhiteSpace(user.Phone))
                user.Phone = EncryptionService.Decrypt(user.Phone) ?? user.Phone;
        }
        catch { }

        return Ok(user);
    }

    [HttpDelete("{id}")]
    [Authorize]
    public async Task<IActionResult> Delete(Guid id)
    {
        var currentUserIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(currentUserIdValue) || !Guid.TryParse(currentUserIdValue, out var currentUserId))
            return Unauthorized();

        if (currentUserId != id && !User.IsInRole("admin"))
            return Forbid();

        var user = await db.Users.FindAsync(id);
        if (user == null)
            return NotFound("User not found.");

        using var transaction = await db.Database.BeginTransactionAsync();
        db.Users.Remove(user);
        await db.SaveChangesAsync();
        await transaction.CommitAsync();

        return Ok(new { message = "User deleted." });
    }

    [HttpDelete("all")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> DeleteAll()
    {
        using var transaction = await db.Database.BeginTransactionAsync();

        var users = await db.Users.ToListAsync();
        if (users.Count == 0)
            return Ok(new { message = "No users to delete.", deletedCount = 0 });

        db.Users.RemoveRange(users);
        await db.SaveChangesAsync();
        await transaction.CommitAsync();

        return Ok(new { message = "All users deleted.", deletedCount = users.Count });
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userIdValue) || !Guid.TryParse(userIdValue, out var userId))
            return Unauthorized();

        var user = await db.Users.FindAsync(userId);
        if (user == null)
            return NotFound();

        try
        { if (!string.IsNullOrWhiteSpace(user.Email)) user.Email = EncryptionService.Decrypt(user.Email) ?? user.Email; }
        catch { }
        try
        { if (!string.IsNullOrWhiteSpace(user.Phone)) user.Phone = EncryptionService.Decrypt(user.Phone) ?? user.Phone; }
        catch { }

        return Ok(user);
    }

    [HttpPatch("{id}/password")]
    [Authorize]
    public async Task<IActionResult> UpdatePassword(Guid id, [FromBody] PasswordUpdateDto dto)
    {
        var user = await db.Users.FindAsync(id);
        if (user == null)
            return NotFound();

        var currentUserIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(currentUserIdValue) || !Guid.TryParse(currentUserIdValue, out var currentUserId))
            return Unauthorized();

        if (currentUserId != user.Id && !User.IsInRole("admin"))
            return Forbid();

        if (string.IsNullOrWhiteSpace(dto.CurrentPassword))
            return BadRequest("Current password is required.");

        if (string.IsNullOrWhiteSpace(dto.NewPassword))
            return BadRequest("New password is required.");

        // Verify current password
        if (!_passwordHashingService.VerifyPassword(dto.CurrentPassword, user.PasswordHash))
            return BadRequest("Current password is incorrect.");

        user.PasswordHash = _passwordHashingService.HashPassword(dto.NewPassword);
        await db.SaveChangesAsync();

        return Ok(new { message = "Password updated" });
    }
}
