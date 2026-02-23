using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Services;
using Dtos;
using Data;

namespace Controllers;

[ApiController]
[Route("users")]
public class UsersController : ControllerBase
{
    private readonly AppDbContext db;
    private readonly PasswordHashingService _passwordHashingService;

    public UsersController(AppDbContext context, PasswordHashingService passwordHashingService)
    {
        db = context;
        _passwordHashingService = passwordHashingService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? role, 
        [FromQuery] string? name, 
        [FromQuery] string? email, 
        [FromQuery] string? sort = "name")
    {
        var query = db.Users.AsQueryable();

        if (!string.IsNullOrWhiteSpace(role))
            query = query.Where(u => u.Role == role);

        if (!string.IsNullOrWhiteSpace(name))
            query = query.Where(u => u.Username != null && u.Username.ToLower().Contains(name.ToLower()));

        if (!string.IsNullOrWhiteSpace(email))
        {
            string? encryptedEmail = EncryptionService.Encrypt(email);
            query = query.Where(u => u.Email == encryptedEmail);
        }

        // Sort
        query = sort switch
        {
            "created" => query.OrderByDescending(u => u.Id),
            "email" => query.OrderBy(u => u.Email),
            _ => query.OrderBy(u => u.Username)
        };

        var users = await query.ToListAsync();

        foreach (var user in users)
        {
            if (!string.IsNullOrWhiteSpace(user.Email))
            {
                try { user.Email = EncryptionService.Decrypt(user.Email) ?? user.Email; }
                catch { }
            }

            if (!string.IsNullOrWhiteSpace(user.Phone))
            {
                try { user.Phone = EncryptionService.Decrypt(user.Phone) ?? user.Phone; }
                catch { }
            }
        }

        return Ok(users);
    }

    [HttpPatch("{id}")]
    public async Task<IActionResult> Patch(Guid id, [FromBody] UserUpdateDto dto)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
            return NotFound("User not found.");

        if (!string.IsNullOrWhiteSpace(dto.email))
        {
            string? encryptedEmail = EncryptionService.Encrypt(dto.email);
            bool emailExists = await db.Users.AnyAsync(u => u.Email == encryptedEmail && u.Id != id);
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

        if (!string.IsNullOrWhiteSpace(dto.role))
            user.Role = dto.role;

        using var transaction = await db.Database.BeginTransactionAsync();
        await db.SaveChangesAsync();
        await transaction.CommitAsync();

        return Ok("User updated.");
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
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
    public async Task<IActionResult> Delete(Guid id)
    {
        var user = await db.Users.FindAsync(id);
        if (user == null)
            return NotFound("User not found.");

        using var transaction = await db.Database.BeginTransactionAsync();
        db.Users.Remove(user);
        await db.SaveChangesAsync();
        await transaction.CommitAsync();

        return Ok(new { message = "User deleted." });
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userIdValue) || !Guid.TryParse(userIdValue, out var userId))
            return Unauthorized();

        var user = await db.Users.FindAsync(userId);
        if (user == null) return NotFound();

        try { if (!string.IsNullOrWhiteSpace(user.Email)) user.Email = EncryptionService.Decrypt(user.Email) ?? user.Email; } catch { }
        try { if (!string.IsNullOrWhiteSpace(user.Phone)) user.Phone = EncryptionService.Decrypt(user.Phone) ?? user.Phone; } catch { }

        return Ok(user);
    }

    [HttpPatch("{id}/password")]
    [Authorize]
    public async Task<IActionResult> UpdatePassword(Guid id, [FromBody] PasswordUpdateDto dto)
    {
        var user = await db.Users.FindAsync(id);
        if (user == null) return NotFound();

        var currentUserIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(currentUserIdValue) || !Guid.TryParse(currentUserIdValue, out var currentUserId))
            return Unauthorized();

        if (currentUserId != user.Id && !User.IsInRole("admin"))
            return Forbid();

        if (string.IsNullOrWhiteSpace(dto.NewPassword))
            return BadRequest("Password is required.");

        user.PasswordHash = _passwordHashingService.HashPassword(dto.NewPassword);
        await db.SaveChangesAsync();

        return Ok(new { message = "Password updated" });
    }
}