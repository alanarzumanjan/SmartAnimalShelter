namespace Dtos;

public class CreateAdoptionRequestDto
{
    public Guid PetId { get; set; }
    public string? Message { get; set; }
}
