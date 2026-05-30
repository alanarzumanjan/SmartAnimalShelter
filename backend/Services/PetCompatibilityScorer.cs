using Dtos;
using Models;

namespace Services;

public static class PetCompatibilityScorer
{
    private const int WeightHousing = 25;
    private const int WeightKids = 20;
    private const int WeightDogs = 20;
    private const int WeightCats = 20;
    private const int WeightEnergy = 15;
    private const int WeightExperience = 10;
    private const int WeightSize = 10;
    private const int WeightTrained = 5;
    private const int MaxRawScore = WeightHousing + WeightKids + WeightDogs +
                                         WeightCats + WeightEnergy + WeightExperience +
                                         WeightSize + WeightTrained; // 125

    private const int PartialCredit = 10;

    // Exact match - full weight; one step away - half; opposite - 0.
    private static readonly Dictionary<string, int> EnergyRank = new(StringComparer.OrdinalIgnoreCase)
    {
        ["low"] = 0,
        ["medium"] = 1,
        ["high"] = 2,
    };

    private static readonly Dictionary<string, int> SizeRank = new(StringComparer.OrdinalIgnoreCase)
    {
        ["small"] = 0,
        ["medium"] = 1,
        ["large"] = 2,
    };

    public static (int Score, List<string> Reasons) Score(Pet pet, MatchRequestDto prefs)
    {
        var reasons = new List<string>();
        int raw = 0;

        raw += ScoreHousing(pet.HousingRequirement, prefs.HousingType, reasons);

        if (prefs.HasKids)
            raw += ScoreBoolean(pet.GoodWithKids, WeightKids, "Good with kids", reasons);
        else
            raw += WeightKids; // not a constraint - full points

        if (prefs.HasDogs)
            raw += ScoreBoolean(pet.GoodWithDogs, WeightDogs, "Good with dogs", reasons);
        else
            raw += WeightDogs;

        if (prefs.HasCats)
            raw += ScoreBoolean(pet.GoodWithCats, WeightCats, "Good with cats", reasons);
        else
            raw += WeightCats;

        raw += ScoreOrdinal(pet.EnergyLevel, prefs.EnergyPreference,
            EnergyRank, WeightEnergy, "Energy level matches", reasons);

        raw += ScoreExperience(pet.ExperienceLevel, prefs.ExperienceLevel, reasons);

        if (prefs.SizePreference != "any")
            raw += ScoreOrdinal(pet.Size, prefs.SizePreference,
                SizeRank, WeightSize, "Size matches your preference", reasons);
        else
            raw += WeightSize; // no preference - full points

        if (prefs.NeedsHouseTrained)
            raw += ScoreBoolean(pet.IsHouseTrained, WeightTrained, "Already house trained", reasons);
        else
            raw += WeightTrained;

        int normalized = (int)Math.Round(raw * 100.0 / MaxRawScore);
        return (Math.Clamp(normalized, 0, 100), reasons);
    }

    public static IReadOnlyList<MatchedPetDto> ScoreAndSort(

        IEnumerable<Pet> pets, MatchRequestDto prefs)
    {
        // O(n) - score every pet
        var scored = pets.Select(pet =>
        {
            var (score, reasons) = Score(pet, prefs);
            return BuildDto(pet, score, reasons);
        });

        // O(n log n) - sort descending by score
        return scored.OrderByDescending(p => p.CompatibilityScore).ToList();
    }

    private static int ScoreHousing(string? requirement, string preference, List<string> reasons)

    {
        if (string.IsNullOrWhiteSpace(requirement))
            return WeightHousing; // unknown - no constraint, full points

        var req = requirement.ToLowerInvariant().Trim();
        var pref = preference.ToLowerInvariant().Trim();

        bool compatible = req switch
        {
            "apartment" => pref == "apartment",
            "house" => pref is "house" or "house_with_yard",
            "house_with_yard" => pref == "house_with_yard",
            _ => true
        };

        if (compatible)
        { reasons.Add("Suits your home type"); return WeightHousing; }
        return 0;
    }

    private static int ScoreBoolean(bool? trait, int weight, string label, List<string> reasons)
    {
        if (trait == true)
        { reasons.Add(label); return weight; }
        if (trait == null)
            return PartialCredit;
        return 0;
    }

    private static int ScoreOrdinal(
        string? petValue, string preference,
        Dictionary<string, int> rankMap, int weight,
        string matchLabel, List<string> reasons)
    {
        if (string.IsNullOrWhiteSpace(petValue))
            return weight / 2; // unknown - neutral partial credit

        if (!rankMap.TryGetValue(petValue, out int petRank))
            return weight / 2;
        if (!rankMap.TryGetValue(preference, out int prefRank))
            return weight / 2;

        int diff = Math.Abs(petRank - prefRank);
        if (diff == 0)
        { reasons.Add(matchLabel); return weight; }
        if (diff == 1)
            return weight / 2;
        return 0;
    }

    private static int ScoreExperience(string? petLevel, string adopterLevel, List<string> reasons)
    {
        if (string.IsNullOrWhiteSpace(petLevel))
            return WeightExperience; // unknown - no constraint

        var pet = petLevel.ToLowerInvariant().Trim();
        var adopter = adopterLevel.ToLowerInvariant().Trim();

        // Experienced adopter can handle any pet
        if (adopter == "experienced")
        {
            reasons.Add("Matches your experience");
            return WeightExperience;
        }

        if (pet is "first_time" or "beginner")
        {
            reasons.Add("Great for first-time owners");
            return WeightExperience;
        }

        if (pet == "experienced")
            return 0;

        // Unknown pet level - partial
        return WeightExperience / 2;
    }

    private static MatchedPetDto BuildDto(Pet pet, int score, List<string> reasons) => new()
    {
        Id = pet.Id,
        Name = pet.Name,
        Age = pet.Age,
        Color = pet.Color,
        Size = pet.Size,
        Description = pet.Description,
        ImageUrl = pet.ImageUrl,
        EnergyLevel = pet.EnergyLevel,
        HousingRequirement = pet.HousingRequirement,
        GoodWithKids = pet.GoodWithKids,
        GoodWithDogs = pet.GoodWithDogs,
        GoodWithCats = pet.GoodWithCats,
        IsNeutered = pet.IsNeutered,
        IsHouseTrained = pet.IsHouseTrained,
        ExperienceLevel = pet.ExperienceLevel,
        SpeciesName = pet.Species?.Name,
        BreedName = pet.Breed?.Name,
        GenderName = pet.Gender?.Name,
        StatusName = pet.Status?.Name,
        ShelterId = pet.ShelterId,
        ShelterName = pet.Shelter?.Name,
        CompatibilityScore = score,
        MatchReasons = reasons,
    };
}
