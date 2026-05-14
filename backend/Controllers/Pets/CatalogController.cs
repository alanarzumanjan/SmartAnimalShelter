using Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Models;

namespace Controllers;

[ApiController]
[Route("catalog")]
public class CatalogController : ControllerBase
{
    private readonly AppDbContext _db;

    public CatalogController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("species")]
    public async Task<IActionResult> GetSpecies(CancellationToken ct)
    {
        var species = await _db.Species.Include(s => s.Breeds).OrderBy(s => s.Name).ToListAsync(ct);
        return Ok(species);
    }

    [HttpGet("genders")]
    public async Task<IActionResult> GetGenders(CancellationToken ct)
    {
        var genders = await _db.Genders.OrderBy(g => g.Id).ToListAsync(ct);
        return Ok(genders);
    }

    [HttpGet("statuses")]
    public async Task<IActionResult> GetStatuses(CancellationToken ct)
    {
        var statuses = await _db.AdoptionStatuses.OrderBy(s => s.Id).ToListAsync(ct);
        return Ok(statuses);
    }
}
