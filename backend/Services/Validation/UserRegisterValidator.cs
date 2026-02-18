using System.Text.RegularExpressions;
using Dtos;

namespace Validation;

public class UserRegisterValidator : IValidator<UserRegisterDto>
{
    public Dictionary<string, string> Validate(UserRegisterDto user)
    {
        var errors = new Dictionary<string, string>();

        // Email
        if (string.IsNullOrWhiteSpace(user.email))
            errors["email"] = "Email is required.";
        else
        {
            if (user.email.Length < 5 || user.email.Length > 50)
                errors["email"] = "Email must be between 5 and 50 characters.";
            else if (!Regex.IsMatch(user.email, @"^[^@\s]+@[^@\s]+\.[^@\s]+$"))
                errors["email"] = "Email is not valid.";
        }

        // Password
        if (string.IsNullOrWhiteSpace(user.password))
            errors["password"] = "Password is required.";
        else
        {
            if (user.password.Length < 8 || user.password.Length > 30)
                errors["password"] = "Password must be between 8 and 30 characters.";
            else if (!Regex.IsMatch(user.password, @"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$"))
                errors["password"] = "Password must contain at least one uppercase letter, one lowercase letter, and one number.";
        }

        // Username
        if (string.IsNullOrWhiteSpace(user.name))
            errors["username"] = "Username is required.";
        else
        {
            if (user.name.Length < 3 || user.name.Length > 20)
                errors["username"] = "Username must be between 3 and 20 characters.";
            else if (!Regex.IsMatch(user.name, @"^[a-zA-Z0-9_]+$"))
                errors["username"] = "Username must contain only letters, numbers, and underscores.";
        }

        return errors;
    }
}
