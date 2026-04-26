namespace Dtos;

public class CreatePetDto
{
    public string? name { get; set; }
    public int speciesId { get; set; }
    public string? breedName { get; set; }
    public int? breedId { get; set; }
    public int? genderId { get; set; }
    public float? age { get; set; }
    public float? weight { get; set; }
    public string? color { get; set; }
    public string? size { get; set; }
    public int statusId { get; set; }
    public string? description { get; set; }
    public string? medicalNotes { get; set; }
    public string? idealHome { get; set; }
    public string? specialNeeds { get; set; }
    public string? currentMedications { get; set; }
    public string? intakeReason { get; set; }
    public DateTime? intakeDate { get; set; }
    public string? energyLevel { get; set; }
    public string? experienceLevel { get; set; }
    public string? housingRequirement { get; set; }
    public string? chipNumber { get; set; }
    public decimal? adoptionFee { get; set; }
    public bool? isNeutered { get; set; }
    public bool? isChipped { get; set; }
    public bool? isHouseTrained { get; set; }
    public bool? goodWithKids { get; set; }
    public bool? goodWithDogs { get; set; }
    public bool? goodWithCats { get; set; }
    public Guid shelterId { get; set; }
}
