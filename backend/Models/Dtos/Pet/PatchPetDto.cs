namespace Dtos;

public class PatchPetDto
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? MedicalNotes { get; set; }
    public string? IdealHome { get; set; }
    public string? SpecialNeeds { get; set; }
    public string? CurrentMedications { get; set; }
    public string? IntakeReason { get; set; }
    public DateTime? IntakeDate { get; set; }
    public string? Color { get; set; }
    public float? Age { get; set; }
    public float? Weight { get; set; }
    public string? Size { get; set; }
    public string? EnergyLevel { get; set; }
    public string? ExperienceLevel { get; set; }
    public string? HousingRequirement { get; set; }
    public int? GenderId { get; set; }
    public int? SpeciesId { get; set; }
    public int? StatusId { get; set; }
    public bool? IsNeutered { get; set; }
    public bool? IsChipped { get; set; }
    public string? ChipNumber { get; set; }
    public bool? IsHouseTrained { get; set; }
    public bool? GoodWithKids { get; set; }
    public bool? GoodWithDogs { get; set; }
    public bool? GoodWithCats { get; set; }
    public decimal? AdoptionFee { get; set; }
}
