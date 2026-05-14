using Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Models;

public class BreedResolver
{
    private readonly AppDbContext _db;
    private readonly ILogger<BreedResolver> _logger;

    public BreedResolver(AppDbContext db, ILogger<BreedResolver> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<int> ResolveBreedIdAsync(string? breedName, int speciesId)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(breedName))
            {
                return await GetOrCreateBreedAsync("Unknown", null);
            }

            string normalized = breedName.ToLower().Trim();

            var existing = await _db.Breeds
                .Where(b => b.Name != null && b.Name.ToLower() == normalized)
                .FirstOrDefaultAsync();

            if (existing != null)
            {
                return existing.Id;
            }

            return await GetOrCreateBreedAsync(breedName!, speciesId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "❌ Breed resolution error, falling back to Unknown");
            return await GetOrCreateBreedAsync("Unknown", speciesId);
        }
    }

    private async Task<int> GetOrCreateBreedAsync(string name, int? speciesId)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            name = "Unknown";
        }

        if (speciesId == null || speciesId == 0)
            throw new InvalidOperationException("Cannot create breed without a valid speciesId.");

        var newBreed = new Breed
        {
            Name = name,
            SpeciesId = speciesId.Value
        };

        _db.Breeds.Add(newBreed);
        await _db.SaveChangesAsync();
        return newBreed.Id;
    }
}
