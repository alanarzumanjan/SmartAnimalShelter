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

    public UsersController(AppDbContext context)
    {
        db = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? role, [FromQuery] string? name, [FromQuery] string? email, [FromQuery] string? sort = "name")
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
                user.Email = EncryptionService.Decrypt(user.Email);

            if (!string.IsNullOrWhiteSpace(user.Phone))
                user.Phone = EncryptionService.Decrypt(user.Phone);
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

            user.Email = encryptedEmail;
        }

        if (!string.IsNullOrWhiteSpace(dto.name))
            user.Username = dto.name;

        if (!string.IsNullOrWhiteSpace(dto.phone))
            user.Phone = EncryptionService.Encrypt(dto.phone);

        if (!string.IsNullOrWhiteSpace(dto.role))
            user.Role = dto.role;

        // Transaction
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

        string decryptedEmail;
        try
        {
            decryptedEmail = EncryptionService.Decrypt(user.Email);
        }
        catch (FormatException)
        {
            decryptedEmail = user.Email;
        }

        if (!string.IsNullOrWhiteSpace(user.Email))
            user.Email = EncryptionService.Decrypt(user.Email);

        if (!string.IsNullOrWhiteSpace(user.Phone))
            user.Phone = EncryptionService.Decrypt(user.Phone);

        return Ok(user);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var user = await db.Users.FindAsync(id);
        if (user == null)
            return NotFound("User not found.");

        // Transaction
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
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized();

        var user = await db.Users.FindAsync(Guid.Parse(userId));
        if (user == null) return NotFound();

        try { user.Email = EncryptionService.Decrypt(user.Email); } catch { }
        try { user.Phone = EncryptionService.Decrypt(user.Phone); } catch { }

        return Ok(user);
    }


    [HttpPatch("{id}/password")]
    [Authorize]
    public async Task<IActionResult> UpdatePassword(Guid id, [FromBody] PasswordUpdateDto dto)
    {
        var user = await db.Users.FindAsync(id);
        if (user == null) return NotFound();

        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (currentUserId != user.Id.ToString() && !User.IsInRole("admin"))
            return Forbid();

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        await db.SaveChangesAsync();

        if (!string.IsNullOrWhiteSpace(user.Email))
            user.Email = EncryptionService.Decrypt(user.Email);

        if (!string.IsNullOrWhiteSpace(user.Phone))
            user.Phone = EncryptionService.Decrypt(user.Phone);

        return Ok(new { message = "Password updated" });
    }

}