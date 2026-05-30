using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Validation;
using Services;
using Models;
using Data;
using Dtos;

namespace Controllers;

[ApiController]
[Route("shelters")]
[Produces("application/json")]
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

    private string? TryDecrypt(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        try
        {
            return EncryptionService.Decrypt(value);
        }
        catch
        {
            return value;
        }
    }

    private object ToShelterResponse(Shelter shelter, string? addressOverride = null, string? phoneOverride = null, string? emailOverride = null)
    {
        return new
        {
            shelter.Id,
            shelter.Name,
            shelter.Description,
            shelter.OwnerId,
            shelter.CreatedAt,
            address = addressOverride ?? shelter.Address,
            phone = phoneOverride ?? shelter.Phone,
            email = emailOverride ?? TryDecrypt(shelter.Email),
        };
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 10, CancellationToken ct = default)
    {
        if (page < 1)
            page = 1;
        if (pageSize < 1)
            pageSize = 10;
        if (pageSize > 100)
            pageSize = 100;

        int totalCount = await db.Shelters.CountAsync(ct);
        int totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);
        int skipCount = (page - 1) * pageSize;

        if (skipCount >= totalCount && totalCount > 0)
            return NotFound(new { message = "Page not found.", currentPage = page, totalPages });

        List<Shelter> shelters = await db.Shelters.Skip(skipCount).Take(pageSize).ToListAsync(ct);

        foreach (var shelter in shelters)
            if (!string.IsNullOrWhiteSpace(shelter.Email))
                shelter.Email = EncryptionService.Decrypt(shelter.Email);

        return Ok(new { currentPage = page, pageSize, totalCount, totalPages, shelters });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        Shelter? shelter = await db.Shelters.Include(s => s.Owner).FirstOrDefaultAsync(s => s.Id == id, ct);
        if (shelter == null)
            return NotFound("Shelter not found.");

        string? ownerPhone = null;
        try
        { if (!string.IsNullOrWhiteSpace(shelter.Owner?.Phone)) ownerPhone = EncryptionService.Decrypt(shelter.Owner.Phone); }
        catch { }

        string? ownerAddress = shelter.Owner?.Address;

        return Ok(ToShelterResponse(
            shelter,
            addressOverride: !string.IsNullOrWhiteSpace(shelter.Address) && shelter.Address != "Address to be updated"
                ? shelter.Address
                : ownerAddress,
            phoneOverride: !string.IsNullOrWhiteSpace(shelter.Phone)
                ? shelter.Phone
                : ownerPhone
        ));
    }

    [Authorize(Roles = "shelter")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ShelterCreateDto dto, CancellationToken ct)
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

            using var transaction = await db.Database.BeginTransactionAsync(ct);
            await db.Shelters.AddAsync(newShelter, ct);
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);

            return Ok(ToShelterResponse(newShelter, newShelter.Address, newShelter.Phone, dto.email));
        }
        catch (Exception ex) { return Problem("Error: " + ex.Message); }
    }

    [Authorize(Roles = "shelter")]
    [HttpPatch("{id}")]
    public async Task<IActionResult> Patch(Guid id, [FromBody] ShelterUpdateDto dto, CancellationToken ct)
    {
        Shelter? shelter = await db.Shelters.FindAsync([id], ct);
        if (shelter == null)
            return NotFound("Shelter not found.");

        Guid? userId = GetUserId();
        if (userId == null || shelter.OwnerId != userId.Value)
            return Forbid();

        ShelterValidator validator = new ShelterValidator();
        Dictionary<string, string> errors = validator.ValidatePatch(dto);
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

            using var transaction = await db.Database.BeginTransactionAsync(ct);
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);

            return Ok(ToShelterResponse(shelter));
        }
        catch (Exception ex) { return Problem("Error: " + ex.Message); }
    }

    [Authorize(Roles = "shelter")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        Shelter? shelter = await db.Shelters.FindAsync([id], ct);
        if (shelter == null)
            return NotFound("Shelter not found.");

        Guid? userId = GetUserId();
        if (userId == null || shelter.OwnerId != userId.Value)
            return Forbid();

        try
        {
            using var transaction = await db.Database.BeginTransactionAsync(ct);
            db.Shelters.Remove(shelter);
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
            return Ok(new { message = "Shelter deleted." });
        }
        catch (Exception ex) { return Problem("Error: " + ex.Message); }
    }
}
