using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Models;
using Data;

namespace Controllers;

[ApiController]
[Route("pets")]
public class PetsController : ControllerBase
{
    private readonly AppDbContext _db;

    public PetsController(AppDbContext db)
    {
        _db = db;
    }

    private Guid? GetUserId()
    {
        string? userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(userIdString, out var id) ? id : null;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid? shelterId, [FromQuery] int? speciesId, [FromQuery] string? name, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        if (page <= 0) page = 1;
        if (pageSize <= 0 || pageSize > 100) pageSize = 10;

        var query = _db.Pets
            .Include(p => p.Species)
            .Include(p => p.Breed)
            .Include(p => p.Gender)
            .Include(p => p.Shelter)
            .AsQueryable();

        if (shelterId != null)
            query = query.Where(p => p.ShelterId == shelterId);
        if (speciesId != null)
            query = query.Where(p => p.SpeciesId == speciesId);
        if (!string.IsNullOrWhiteSpace(name))
            query = query.Where(p => p.Name != null && p.Name.ToLower().Contains(name.ToLower()));

        int totalCount = await query.CountAsync();
        int totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        var pets = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var result = pets.Select(p => new
        {
            p.Id,
            p.Name,
            p.Age,
            p.Color,
            p.Description,
            p.ImageUrl,
            p.Category,
            p.Price,
            p.StatusId,
            p.ShelterId,
            p.CreatedAt,
            species = p.Species,
            breed = p.Breed,
            gender = p.Gender,
            status = p.Status,
            shelter = p.Shelter == null ? null : new
            {
                p.Shelter.Id,
                p.Shelter.Name,
                p.Shelter.OwnerId
            }
        });

        return Ok(new { currentPage = page, pageSize, totalCount, totalPages, pets = result });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var pet = await _db.Pets
            .Include(p => p.Species)
            .Include(p => p.Breed)
            .Include(p => p.Gender)
            .Include(p => p.Shelter)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (pet == null)
            return NotFound("Pet not found");

        return Ok(new
        {
            pet.Id,
            pet.Name,
            pet.Age,
            pet.Color,
            pet.Description,
            pet.ImageUrl,
            pet.MongoImageId,
            pet.Category,
            pet.Price,
            pet.ExternalUrl,
            pet.ShelterId,
            pet.EnclosureId,
            pet.CreatedAt,
            species = pet.Species,
            breed = pet.Breed,
            gender = pet.Gender,
            status = pet.Status,
            shelter = pet.Shelter == null ? null : new
            {
                pet.Shelter.Id,
                pet.Shelter.Name,
                pet.Shelter.Address,
                pet.Shelter.OwnerId
            }
        });
    }

    [Authorize(Roles = "veterinarian,shelter")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePetDto dto)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized();

        // Find user's shelter, or auto-create one if none exists
        var shelter = await _db.Shelters.FirstOrDefaultAsync(s => s.Id == dto.shelterId && s.OwnerId == userId);

        // If no shelter exists for this user, auto-create one
        if (shelter == null)
        {
            var user = await _db.Users.FindAsync(userId);
            if (user == null)
                return Unauthorized();

            shelter = new Shelter
            {
                Id = Guid.NewGuid(),
                Name = $"{user.Username}'s {(user.Role == "veterinarian" ? "Vet Clinic" : "Shelter")}",
                Address = "Address to be updated",
                Phone = null,
                Email = user.Email,
                Description = null,
                OwnerId = userId.Value,
                CreatedAt = DateTime.UtcNow
            };

            _db.Shelters.Add(shelter);
            await _db.SaveChangesAsync();
        }

        // Resolve breed: prefer breedName, fallback to breedId, or create default
        var breedResolver = new BreedResolver(_db);
        int breedId;
        if (!string.IsNullOrWhiteSpace(dto.breedName))
        {
            breedId = await breedResolver.ResolveBreedIdAsync(dto.breedName, dto.speciesId);
        }
        else if (dto.breedId.HasValue && dto.breedId.Value > 0)
        {
            breedId = dto.breedId.Value;
        }
        else
        {
            // Create a default breed for the species
            breedId = await breedResolver.ResolveBreedIdAsync("Mixed", dto.speciesId);
        }

        var newPet = new Pet
        {
            Id = Guid.NewGuid(),
            Name = dto.name,
            SpeciesId = dto.speciesId,
            BreedId = breedId,
            GenderId = dto.genderId,
            Age = dto.age,
            Color = dto.color,
            StatusId = dto.statusId,
            Description = dto.description,
            ShelterId = shelter.Id,
            CreatedAt = DateTime.UtcNow
        };

        using var transaction = await _db.Database.BeginTransactionAsync();
        await _db.Pets.AddAsync(newPet);
        await _db.SaveChangesAsync();
        await transaction.CommitAsync();

        return Ok(newPet);
    }

    [Authorize(Roles = "veterinarian,shelter")]
    [HttpPatch("{id}")]
    public async Task<IActionResult> Patch(Guid id, [FromBody] PatchPetDto patch)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized();

        var pet = await _db.Pets.FirstOrDefaultAsync(p => p.Id == id);
        if (pet == null)
            return NotFound("Pet not found");

        var shelter = await _db.Shelters.FirstOrDefaultAsync(s => s.Id == pet.ShelterId);
        if (shelter == null || shelter.OwnerId != userId)
            return StatusCode(403, "You do not own this shelter.");

        if (patch.Name != null) pet.Name = patch.Name;
        if (patch.Description != null) pet.Description = patch.Description;
        if (patch.Color != null) pet.Color = patch.Color;
        if (patch.Age != null) pet.Age = patch.Age;
        if (patch.GenderId != null) pet.GenderId = patch.GenderId;
        if (patch.SpeciesId != null) pet.SpeciesId = patch.SpeciesId.Value;
        if (patch.StatusId != null) pet.StatusId = patch.StatusId.Value;

        await _db.SaveChangesAsync();

        return Ok(pet);
    }

    [Authorize(Roles = "veterinarian,shelter")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized();

        var pet = await _db.Pets.FirstOrDefaultAsync(p => p.Id == id);
        if (pet == null)
            return NotFound("Pet not found");

        var shelter = await _db.Shelters.FirstOrDefaultAsync(s => s.Id == pet.ShelterId);
        if (shelter == null || shelter.OwnerId != userId)
            return StatusCode(403, "You do not own this shelter.");

        using var transaction = await _db.Database.BeginTransactionAsync();
        _db.Pets.Remove(pet);
        await _db.SaveChangesAsync();
        await transaction.CommitAsync();

        return Ok("Pet deleted.");
    }

    [Authorize(Roles = "veterinarian,shelter")]
    [HttpPatch("{id}/breed")]
    public async Task<IActionResult> UpdateBreed(Guid id, [FromBody] UpdateBreedDto dto)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized();

        var pet = await _db.Pets
            .Include(p => p.Species)
            .FirstOrDefaultAsync(p => p.Id == id);
        if (pet == null)
            return NotFound("Pet not found");

        var shelter = await _db.Shelters.FirstOrDefaultAsync(s => s.Id == pet.ShelterId);
        if (shelter == null || shelter.OwnerId != userId)
            return StatusCode(403, "You do not own this shelter.");

        // Resolve or create breed by name
        var breedName = dto?.breedName?.Trim();
        if (string.IsNullOrWhiteSpace(breedName))
            return BadRequest("Breed name is required.");

        var breedResolver = new BreedResolver(_db);
        int breedId = await breedResolver.ResolveBreedIdAsync(breedName, pet.SpeciesId);

        pet.BreedId = breedId;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Breed updated", breedId, breedName });
    }
}

public class PatchPetDto
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? Color { get; set; }
    public float? Age { get; set; }
    public int? GenderId { get; set; }
    public int? SpeciesId { get; set; }
    public int? StatusId { get; set; }
}

public class UpdateBreedDto
{
    public string? breedName { get; set; }
}

public class CreatePetDto
{
    public string? name { get; set; }
    public int speciesId { get; set; }
    public string? breedName { get; set; }
    public int? breedId { get; set; }
    public int? genderId { get; set; }
    public float? age { get; set; }
    public string? color { get; set; }
    public int statusId { get; set; }
    public string? description { get; set; }
    public Guid shelterId { get; set; }
}