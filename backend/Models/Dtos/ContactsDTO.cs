using System.ComponentModel.DataAnnotations;

public class ContactsDTO
{
    [Required]
    [MinLength(2)]
    public string? Name { get; set; }

    [Required]
    [EmailAddress]
    public string? Email { get; set; }

    [Required]
    [MinLength(5)]
    public string? Message { get; set; }
}