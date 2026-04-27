using System.Security.Claims;
using Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Models;

namespace Controllers;

[ApiController]
[Route("pets/adoption")]
public class AdoptionController : ControllerBase
{
    private readonly AppDbContext _db;

    public AdoptionController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetUserAdoptions(Guid userId)
    {
        var adoptions = await _db.AdoptionRequests
            .Include(a => a.Pet)
            .ThenInclude(p => p.Species)
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new
            {
                a.Id,
                a.PetId,
                petName = a.Pet.Name,
                a.UserId,
                a.Message,
                a.Status,
                a.CreatedAt
            })
            .ToListAsync();

        return Ok(new { data = adoptions });
    }

    [HttpPost]
    [Authorize]
    public async Task<IActionResult> CreateAdoptionRequest([FromBody] CreateAdoptionRequestDto dto)
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userIdValue) || !Guid.TryParse(userIdValue, out var userId))
            return Unauthorized();

        var pet = await _db.Pets.FindAsync(dto.PetId);
        if (pet == null)
            return NotFound("Pet not found.");

        // Check if user already has a pending request for this pet
        var existing = await _db.AdoptionRequests
            .FirstOrDefaultAsync(a => a.UserId == userId && a.PetId == dto.PetId && a.Status == AdoptionRequestStatus.pending);

        if (existing != null)
            return BadRequest("You already have a pending request for this pet.");

        var adoption = new Models.AdoptionRequest
        {
            PetId = dto.PetId,
            UserId = userId,
            Message = dto.Message,
            Status = AdoptionRequestStatus.pending
        };

        _db.AdoptionRequests.Add(adoption);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Adoption request submitted", data = adoption.Id });
    }

    [HttpPatch("{id}/status")]
    [Authorize(Roles = "shelter,admin")]
    public async Task<IActionResult> UpdateAdoptionStatus(Guid id, [FromBody] UpdateAdoptionStatusDto dto)
    {
        var adoption = await _db.AdoptionRequests.FindAsync(id);
        if (adoption == null)
            return NotFound("Adoption request not found.");

        if (Enum.TryParse<AdoptionRequestStatus>(dto.Status, true, out var newStatus))
            adoption.Status = newStatus;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Adoption status updated" });
    }
}

public class CreateAdoptionRequestDto
{
    public Guid PetId { get; set; }
    public string? Message { get; set; }
}

public class UpdateAdoptionStatusDto
{
    public string Status { get; set; } = "pending"; // pending | approved | rejected
}
