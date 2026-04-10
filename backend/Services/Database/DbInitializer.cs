using Microsoft.EntityFrameworkCore;
using System.Text.Json; 
using Models;
using Data;

public static class DbInitializer
{
    private static readonly List<Species> RequiredSpecies = new()
    {
        new Species { Id = 1, Name = "Dogs" },
        new Species { Id = 2, Name = "Cats" },
        new Species { Id = 3, Name = "Exotic" },
        new Species { Id = 4, Name = "Rodent" },
        new Species { Id = 5, Name = "Bird" },
        new Species { Id = 6, Name = "Fish" },
        new Species { Id = 7, Name = "Farm" },
        new Species { Id = 8, Name = "Reptile" },
        new Species { Id = 9, Name = "Unknown" }
    };

    public static async Task EnsureDbIsInitializedAsync(AppDbContext db)
    {
        Console.WriteLine("🔍 Checking species...");

        foreach (var species in RequiredSpecies)
        {
            var exists = await db.Species.AnyAsync(s => s.Id == species.Id);
            if (!exists)
            {
                db.Species.Add(species);
                await db.SaveChangesAsync();
                var logMessage = $"> ➕ Added missing species: {species.Name} (Id={species.Id})";
                Console.WriteLine(logMessage);
            }
        }

        Console.WriteLine("✅ Species check complete.");
            var logMessage2 = "> ✅ Species check complete.";
            Console.WriteLine(logMessage2);
        await SeedBreedsAsync(db);
    }

    private static async Task SeedBreedsAsync(AppDbContext db)
    {
    var breedsPath = Path.Combine(Directory.GetCurrentDirectory(), "Data", "Seed", "species_breeds.json");
    
    if (!File.Exists(breedsPath))
    {
        var logMessage3 = "> ⚠️ species_breeds.json not found. Skipping breeds seed.";
        Console.WriteLine(logMessage3);
        return;
    }

    try
    {
        var json = await File.ReadAllTextAsync(breedsPath);
        
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        Console.WriteLine("🔍 Checking breeds...");

        foreach (var speciesProp in root.EnumerateObject())
        {
            var speciesData = speciesProp.Value;
            int speciesId = speciesData.GetProperty("species_id").GetInt32();
            
            var speciesExists = await db.Species.AnyAsync(s => s.Id == speciesId);
            if (!speciesExists)
            {
                Console.WriteLine($"⚠️ Skipping {speciesProp.Name}: SpeciesId {speciesId} not found");
                continue;
            }

            var breedsArray = speciesData.GetProperty("breeds");
            
            foreach (var breedName in breedsArray.EnumerateArray())
            {
                var name = breedName.GetString();
                if (string.IsNullOrWhiteSpace(name)) continue;

                var exists = await db.Breeds.AnyAsync(b => 
                    b.Name.ToLower() == name.ToLower() && 
                    b.SpeciesId == speciesId);
                
                if (!exists)
                {
                    db.Breeds.Add(new Breed
                    {
                        Name = name,
                        SpeciesId = speciesId
                    });
                }
            }
        }

        await db.SaveChangesAsync();
        Console.WriteLine("✅ Breeds check complete.");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ Error seeding breeds: {ex.Message}");
    }
}
}

public class BreedSeedDto
{
    public string Name { get; set; } = string.Empty;
    public int SpeciesId { get; set; }
}