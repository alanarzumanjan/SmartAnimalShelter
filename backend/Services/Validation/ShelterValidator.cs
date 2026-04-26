using Dtos;

namespace Validation;

public class ShelterValidator : IValidator<ShelterCreateDto>
{
    public Dictionary<string, string> Validate(ShelterCreateDto dto)
    {
        var errors = new Dictionary<string, string>();

        if (string.IsNullOrWhiteSpace(dto.name))
            errors["name"] = "Name is required.";

        if (string.IsNullOrWhiteSpace(dto.address))
            errors["address"] = "Address is required.";

        if (string.IsNullOrWhiteSpace(dto.email))
            errors["email"] = "Email is required.";
        else if (!IsValidEmail(dto.email))
            errors["email"] = "Invalid email format.";

        return errors;
    }

    public Dictionary<string, string> ValidatePatch(ShelterCreateDto dto)
    {
        var errors = new Dictionary<string, string>();

        if (!string.IsNullOrWhiteSpace(dto.name) && dto.name.Length < 2)
            errors["name"] = "Name must be at least 2 characters.";

        if (!string.IsNullOrWhiteSpace(dto.email) && !IsValidEmail(dto.email))
            errors["email"] = "Invalid email format.";

        return errors;
    }

    private bool IsValidEmail(string email)
    {
        try
        {
            var addr = new System.Net.Mail.MailAddress(email);
            return addr.Address == email;
        }
        catch
        {
            return false;
        }
    }
}
