using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Validation;
using Services;
using Models;
using Dtos;
using Data;

namespace Controllers;

[ApiController]
[Route("shelters")]
public class SheltersController : ControllerBase
{
    private readonly AppDbContext db;

    public SheltersController(AppDbContext dbContext)
    {
        db = dbContext;
    }

    private Guid? GetUserId()
    {
        string? userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        Guid parsedId;
        bool isValid = Guid.TryParse(userIdString, out parsedId);

        if (isValid)
            return parsedId;
        else
            return null;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        if (page < 1)
            page = 1;

        // Default to 10 items per page if invalid
        if (pageSize < 1)
            pageSize = 10;

        // Cap the page size to avoid abuse or performance issues
        if (pageSize > 100)
            pageSize = 100;

        int totalCount = await db.Shelters.CountAsync();

        // Calculate how many total pages there are
        int totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        // Determine how many items to skip
        int skipCount = (page - 1) * pageSize;

        if (skipCount >= totalCount && totalCount > 0)
        {
            return NotFound(new
            {
                message = "Page not found.",
                currentPage = page,
                totalPages = totalPages
            });
        }

        // Get the paginated data from the database
        List<Shelter> shelters = await db.Shelters
            .Skip(skipCount)
            .Take(pageSize)
            .ToListAsync();

        // Decrypt
        foreach (var shelter in shelters)
        {
            if (!string.IsNullOrWhiteSpace(shelter.Email))
                shelter.Email = EncryptionService.Decrypt(shelter.Email);
        }
        return Ok(new
        {
            currentPage = page,
            pageSize = pageSize,
            totalCount = totalCount,
            totalPages = totalPages,
            shelters = shelters
        });
    }


    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        Shelter? shelter = await db.Shelters
            .Include(s => s.Owner)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (shelter == null)
            return NotFound("Shelter not found.");

        shelter.Email = EncryptionService.Decrypt(shelter.Email);
        return Ok(shelter);
    }

    [Authorize(Roles = "shelter_owner")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ShelterCreateDto dto)
    {
        ShelterValidator validator = new ShelterValidator();
        Dictionary<string, string> errors = validator.Validate(dto);

        if (errors.Count > 0)
            return BadRequest(new { errors });

        Guid? userId = GetUserId();
        if (userId == null)
            return Unauthorized();

        try
        {
            Shelter newShelter = new Shelter
            {
                Id = Guid.NewGuid(),
                Name = dto.name ?? string.Empty,
                Address = dto.address ?? string.Empty,
                Phone = dto.phone ?? string.Empty,
                Email = EncryptionService.Encrypt(dto.email ?? string.Empty),
                Description = dto.description ?? string.Empty,
                OwnerId = userId.Value,
                CreatedAt = DateTime.UtcNow
            };

            // Create Shelter Transaction
            using var transaction = await db.Database.BeginTransactionAsync();
            await db.Shelters.AddAsync(newShelter);
            await db.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(newShelter);
        }
        catch (Exception ex)
        {
            return Problem("Error: " + ex.Message);
        }
    }

    [Authorize(Roles = "shelter_owner")]
    [HttpPatch("{id}")]
    public async Task<IActionResult> Patch(Guid id, [FromBody] ShelterUpdateDto dto)
    {
        Shelter? shelter = await db.Shelters.FindAsync(id);
        if (shelter == null)
            return NotFound("Shelter not found.");

        Guid? userId = GetUserId();
        if (userId == null || shelter.OwnerId != userId.Value)
            return Forbid();

        ShelterValidator validator = new ShelterValidator();
        Dictionary<string, string> errors = validator.Validate(dto, isPatch: true);

        if (errors.Count > 0)
            return BadRequest(new { errors });

        try
        {
            if (dto.name != null)
                shelter.Name = dto.name;
            if (dto.address != null)
                shelter.Address = dto.address;
            if (dto.phone != null)
                shelter.Phone = dto.phone;
            if (dto.email != null)
                shelter.Email = EncryptionService.Encrypt(dto.email);
            if (dto.description != null)
                shelter.Description = dto.description;

            // Transaction
            using var transaction = await db.Database.BeginTransactionAsync();
            await db.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(shelter);
        }
        catch (Exception ex)
        {
            return Problem("Error: " + ex.Message);
        }
    }

    [Authorize(Roles = "shelter_owner")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        Shelter? shelter = await db.Shelters.FindAsync(id);
        if (shelter == null)
            return NotFound("Shelter not found.");

        Guid? userId = GetUserId();
        if (userId == null || shelter.OwnerId != userId.Value)
            return Forbid();

        try
        {
            // Transaction
            using var transaction = await db.Database.BeginTransactionAsync();
            db.Shelters.Remove(shelter);
            await db.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new { message = "Shelter deleted." });
        }
        catch (Exception ex)
        {
            return Problem("Error: " + ex.Message);
        }
    }
}