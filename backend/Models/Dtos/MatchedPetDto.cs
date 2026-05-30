namespace Dtos;

public class MatchedPetDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";


    public float? Age { get; set; }
    public string? Color { get; set; }

    public string? Size { get; set; }

    public string? Description { get; set; }

    public string? ImageUrl { get; set; }

    public string? EnergyLevel { get; set; }
    public string? HousingRequirement { get; set; }

    public bool? GoodWithKids { get; set; }
    public bool? GoodWithDogs { get; set; }
    public bool? GoodWithCats { get; set; }

    public bool? IsNeutered { get; set; }
    public bool? IsHouseTrained { get; set; }

    public string? ExperienceLevel { get; set; }

    public string? SpeciesName { get; set; }
    public string? BreedName { get; set; }
    public string? GenderName { get; set; }
    public string? StatusName { get; set; }

    public Guid? ShelterId { get; set; }
    public string? ShelterName { get; set; }


    public int CompatibilityScore { get; set; }
    public List<string> MatchReasons { get; set; } = new();
}

