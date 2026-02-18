using Microsoft.EntityFrameworkCore;
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
                Console.WriteLine($"➕ Added missing species: {species.Name} (Id={species.Id})");
            }
        }

        await db.SaveChangesAsync();
        Console.WriteLine("✅ Species check complete.");
    }
}
