using Data;
using Dtos;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Services;

namespace Controllers;

[ApiController]
[Route("pets/match")]
public class MatchController : ControllerBase
{
    private readonly AppDbContext _db;

    public MatchController(AppDbContext db)
    {
        _db = db;
    }


    [HttpPost]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Match([FromBody] MatchRequestDto dto, CancellationToken ct)
    {
        var validHousing = new[] { "apartment", "house", "house_with_yard" };
        var validEnergy  = new[] { "low", "medium", "high" };

        if (!validHousing.Contains(dto.HousingType?.ToLowerInvariant()))
            return BadRequest(new { error = "HousingType must be: apartment | house | house_with_yard" });

        if (!validEnergy.Contains(dto.EnergyPreference?.ToLowerInvariant()))
            return BadRequest(new { error = "EnergyPreference must be: low | medium | high" });

        // Fetch only available pets with all navigation properties needed by scorer
        var pets = await _db.Pets
            .AsNoTracking()
            .Include(p => p.Species)
            .Include(p => p.Breed)
            .Include(p => p.Gender)
            .Include(p => p.Status)
            .Include(p => p.Shelter)
            .Where(p => p.Status != null && p.Status.Name == "available")
            .ToListAsync(ct);

        // O(n log n) — score and sort
        var results = PetCompatibilityScorer.ScoreAndSort(pets, dto);

        return Ok(new
        {
            total = results.Count,
            preferences = dto,
            pets = results
        });
    }
}
