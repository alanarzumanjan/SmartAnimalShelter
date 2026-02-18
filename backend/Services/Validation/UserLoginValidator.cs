using System.Text.RegularExpressions;
using Dtos;

namespace Validation;

public class UserLoginValidator : IValidator<UserLoginDto>
{
    public Dictionary<string, string> Validate(UserLoginDto user)
    {
        var errors = new Dictionary<string, string>();

        // Email
        if (string.IsNullOrWhiteSpace(user.email))
            errors["email"] = "Email is required.";
        else if (!Regex.IsMatch(user.email, @"^[^@\s]+@[^@\s]+\.[^@\s]+$"))
            errors["email"] = "Email is not valid.";

        // Password
        if (string.IsNullOrWhiteSpace(user.password))
            errors["password"] = "Password is required.";

        return errors;
    }
}
