using System.Security.Claims;
using Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Models;

namespace Controllers;

[ApiController]
[Route("enclosures")]
[Authorize(Roles = "shelter,admin")]
public class EnclosuresController : ControllerBase
{
    private readonly AppDbContext _db;

    public EnclosuresController(AppDbContext db) => _db = db;

    private Guid? GetUserId()
    {
        var val = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(val, out var id) ? id : null;
    }

    private async Task<Shelter?> GetOwnedShelterAsync(Guid userId) =>
        await _db.Shelters.FirstOrDefaultAsync(s => s.OwnerId == userId);

    [HttpGet("my")]
    public async Task<IActionResult> GetMy()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var shelter = await GetOwnedShelterAsync(userId.Value);
        if (shelter == null) return NotFound(new { error = "Shelter not found." });

        var enclosures = await _db.Enclosures
            .Where(e => e.ShelterId == shelter.Id)
            .Include(e => e.Pets)
            .Include(e => e.Devices)
            .OrderBy(e => e.Name)
            .ToListAsync();

        var deviceIds = enclosures
            .SelectMany(e => e.Devices)
            .Select(d => d.DeviceId)
            .Distinct()
            .ToList();

        var latestMeasurements = await _db.Measurements
            .Where(m => deviceIds.Contains(m.DeviceId))
            .GroupBy(m => m.DeviceId)
            .Select(g => g.OrderByDescending(m => m.Timestamp).First())
            .ToListAsync();

        var measurementByDevice = latestMeasurements.ToDictionary(m => m.DeviceId);

        var result = enclosures.Select(e =>
        {
            var device = e.Devices.FirstOrDefault();
            var measurement = device != null && measurementByDevice.TryGetValue(device.DeviceId, out var m) ? m : null;

            return new
            {
                e.Id,
                e.Name,
                e.Description,
                e.ShelterId,
                e.CreatedAt,
                pets = e.Pets.Select(p => new { p.Id, p.Name, p.MongoImageId }),
                device = device == null ? null : new
                {
                    device.Id,
                    device.DeviceId,
                    device.Name,
                    device.LastSeenAt
                },
                latestMeasurement = measurement == null ? null : new
                {
                    co2 = measurement.CO2,
                    measurement.Temperature,
                    measurement.Humidity,
                    measurement.Timestamp
                }
            };
        });

        return Ok(new { shelterId = shelter.Id, data = result });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetOne(Guid id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var shelter = await GetOwnedShelterAsync(userId.Value);
        if (shelter == null) return NotFound(new { error = "Shelter not found." });

        var enclosure = await _db.Enclosures
            .Include(e => e.Pets).ThenInclude(p => p.Species)
            .Include(e => e.Pets).ThenInclude(p => p.Breed)
            .Include(e => e.Devices)
            .FirstOrDefaultAsync(e => e.Id == id && e.ShelterId == shelter.Id);

        if (enclosure == null) return NotFound(new { error = "Enclosure not found." });

        var device = enclosure.Devices.FirstOrDefault();
        var measurement = device != null
            ? await _db.Measurements
                .Where(m => m.DeviceId == device.DeviceId)
                .OrderByDescending(m => m.Timestamp)
                .FirstOrDefaultAsync()
            : null;

        return Ok(new
        {
            enclosure.Id,
            enclosure.Name,
            enclosure.Description,
            enclosure.ShelterId,
            enclosure.CreatedAt,
            pets = enclosure.Pets.Select(p => new
            {
                p.Id, p.Name, p.MongoImageId,
                species = p.Species?.Name,
                breed = p.Breed?.Name
            }),
            device = device == null ? null : new
            {
                device.Id, device.DeviceId, device.Name, device.Location, device.LastSeenAt
            },
            latestMeasurement = measurement == null ? null : new
            {
                measurement.CO2,
                measurement.Temperature,
                measurement.Humidity,
                measurement.Timestamp
            }
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] EnclosureDto dto)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var shelter = await GetOwnedShelterAsync(userId.Value);
        if (shelter == null) return NotFound(new { error = "Shelter not found." });

        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { error = "Name is required." });

        var enclosure = new Enclosure
        {
            Id = Guid.NewGuid(),
            Name = dto.Name.Trim(),
            Description = dto.Description?.Trim(),
            ShelterId = shelter.Id,
            CreatedAt = DateTime.UtcNow
        };

        _db.Enclosures.Add(enclosure);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Enclosure created.", data = new { enclosure.Id, enclosure.Name, enclosure.Description, enclosure.ShelterId } });
    }

    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] EnclosureDto dto)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var shelter = await GetOwnedShelterAsync(userId.Value);
        if (shelter == null) return NotFound(new { error = "Shelter not found." });

        var enclosure = await _db.Enclosures.FirstOrDefaultAsync(e => e.Id == id && e.ShelterId == shelter.Id);
        if (enclosure == null) return NotFound(new { error = "Enclosure not found." });

        if (!string.IsNullOrWhiteSpace(dto.Name)) enclosure.Name = dto.Name.Trim();
        if (dto.Description != null) enclosure.Description = dto.Description.Trim();

        await _db.SaveChangesAsync();
        return Ok(new { message = "Enclosure updated." });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var shelter = await GetOwnedShelterAsync(userId.Value);
        if (shelter == null) return NotFound(new { error = "Shelter not found." });

        var enclosure = await _db.Enclosures.FirstOrDefaultAsync(e => e.Id == id && e.ShelterId == shelter.Id);
        if (enclosure == null) return NotFound(new { error = "Enclosure not found." });

        // Detach pets and devices before deleting
        await _db.Pets.Where(p => p.EnclosureId == id)
            .ExecuteUpdateAsync(s => s.SetProperty(p => p.EnclosureId, (Guid?)null));
        await _db.Devices.Where(d => d.EnclosureId == id)
            .ExecuteUpdateAsync(s => s.SetProperty(d => d.EnclosureId, (Guid?)null));

        _db.Enclosures.Remove(enclosure);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Enclosure deleted." });
    }

    [HttpPatch("{id:guid}/device")]
    public async Task<IActionResult> AssignDevice(Guid id, [FromBody] AssignDeviceDto dto)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var shelter = await GetOwnedShelterAsync(userId.Value);
        if (shelter == null) return NotFound(new { error = "Shelter not found." });

        var enclosure = await _db.Enclosures.FirstOrDefaultAsync(e => e.Id == id && e.ShelterId == shelter.Id);
        if (enclosure == null) return NotFound(new { error = "Enclosure not found." });

        // Detach previous device from this enclosure
        await _db.Devices.Where(d => d.EnclosureId == id)
            .ExecuteUpdateAsync(s => s.SetProperty(d => d.EnclosureId, (Guid?)null));

        if (dto.DeviceId != null)
        {
            var device = await _db.Devices.FirstOrDefaultAsync(d => d.Id == dto.DeviceId && d.UserId == userId.Value);
            if (device == null) return NotFound(new { error = "Device not found." });

            device.EnclosureId = id;
            device.ShelterId = shelter.Id;
            await _db.SaveChangesAsync();
        }

        return Ok(new { message = "Device assigned." });
    }

    [HttpPatch("{id:guid}/pets/{petId:guid}")]
    public async Task<IActionResult> AssignPet(Guid id, Guid petId)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var shelter = await GetOwnedShelterAsync(userId.Value);
        if (shelter == null) return NotFound(new { error = "Shelter not found." });

        var enclosure = await _db.Enclosures.FirstOrDefaultAsync(e => e.Id == id && e.ShelterId == shelter.Id);
        if (enclosure == null) return NotFound(new { error = "Enclosure not found." });

        var pet = await _db.Pets.FirstOrDefaultAsync(p => p.Id == petId && p.ShelterId == shelter.Id);
        if (pet == null) return NotFound(new { error = "Pet not found." });

        pet.EnclosureId = id;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Pet assigned to enclosure." });
    }

    [HttpDelete("{id:guid}/pets/{petId:guid}")]
    public async Task<IActionResult> RemovePet(Guid id, Guid petId)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var shelter = await GetOwnedShelterAsync(userId.Value);
        if (shelter == null) return NotFound(new { error = "Shelter not found." });

        var pet = await _db.Pets.FirstOrDefaultAsync(p => p.Id == petId && p.ShelterId == shelter.Id && p.EnclosureId == id);
        if (pet == null) return NotFound(new { error = "Pet not found in this enclosure." });

        pet.EnclosureId = null;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Pet removed from enclosure." });
    }
}

public class EnclosureDto
{
    public string Name { get; set; } = "";
    public string? Description { get; set; }
}

public class AssignDeviceDto
{
    public Guid? DeviceId { get; set; }
}
