namespace Dtos;

public class MatchRequestDto
{
    /// <summary>Adopter's housing type: "apartment" | "house" | "house_with_yard"</summary>
    public string HousingType { get; set; } = "apartment";

    /// <summary>Does the adopter have children at home?</summary>
    public bool HasKids { get; set; }

    /// <summary>Does the adopter have dogs at home?</summary>
    public bool HasDogs { get; set; }

    /// <summary>Does the adopter have cats at home?</summary>
    public bool HasCats { get; set; }

    /// <summary>Desired activity level: "low" | "medium" | "high"</summary>
    public string EnergyPreference { get; set; } = "medium";
}

public class MatchedPetDto
{
    public Guid Id { get; init; }
    public string? Name { get; init; }
    public float? Age { get; init; }
    public string? Color { get; init; }
    public string? Size { get; init; }
    public string? Description { get; init; }
    public string? ImageUrl { get; init; }
    public string? EnergyLevel { get; init; }
    public string? HousingRequirement { get; init; }
    public bool? GoodWithKids { get; init; }
    public bool? GoodWithDogs { get; init; }
    public bool? GoodWithCats { get; init; }
    public bool? IsNeutered { get; init; }
    public string? SpeciesName { get; init; }
    public string? BreedName { get; init; }
    public string? GenderName { get; init; }
    public string? StatusName { get; init; }
    public Guid ShelterId { get; init; }
    public string? ShelterName { get; init; }

    /// <summary>Compatibility score 0–100 computed by PetCompatibilityScorer.</summary>
    public int CompatibilityScore { get; init; }

    /// <summary>Human-readable reasons why this pet matched.</summary>
    public IReadOnlyList<string> MatchReasons { get; init; } = [];
}
