using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using MailKit.Net.Smtp;
using MimeKit;

[ApiController]
[Route("[controller]")]
public class ContactsController : ControllerBase
{
    private readonly ILogger<ContactsController> _logger;

    public ContactsController(ILogger<ContactsController> logger)
    {
        _logger = logger;
    }

    [HttpPost]
    public async Task<ActionResult> SendMessage([FromBody] ContactsDTO form)
    {
        try
        {
            var emailPattern = @"^[^@\s]+@[^@\s]+\.[^@\s]+$";
            if (!string.IsNullOrEmpty(form.Email) && !Regex.IsMatch(form.Email, emailPattern))
            {
                _logger.LogWarning("> Contacts email send: Invalid email format {Email}", form.Email);
                return BadRequest("Invalid email format.");
            }

            var emailEnv = Environment.GetEnvironmentVariable("EMAIL_ADDRESS");
            var passwordEnv = Environment.GetEnvironmentVariable("EMAIL_PASSWORD");
            var nameEnv = Environment.GetEnvironmentVariable("EMAIL_NAME") ?? "Iot meter Support Team";

            _logger.LogInformation("> 📧 Contact form received from {Email}: {Message}", form.Email, form.Message);

            // Check if email is configured
            if (string.IsNullOrEmpty(emailEnv) || string.IsNullOrEmpty(passwordEnv))
            {
                _logger.LogWarning("> ⚠️ Email not configured. Message saved to logs.");
                return Ok(new { message = "Message received successfully!" });
            }

            var emailMessage = new MimeMessage();
            emailMessage.From.Add(new MailboxAddress(form.Name, form.Email ?? string.Empty));
            emailMessage.To.Add(new MailboxAddress(nameEnv, emailEnv ?? string.Empty));
            emailMessage.Subject = "New message from portfolio";
            emailMessage.Body = new TextPart("plain")
            {
                Text = $"Name: {form.Name}\nEmail: {form.Email}\nMessage: {form.Message}"
            };

            using var client = new SmtpClient();
            client.Timeout = 5000; // 5 seconds

            try
            {
                await client.ConnectAsync("smtp.gmail.com", 465, true);
                await client.AuthenticateAsync(emailEnv, passwordEnv);
                await client.SendAsync(emailMessage);
                await client.DisconnectAsync(true);

                _logger.LogInformation("> ✅ Email notification sent to {Email}", emailEnv);
                return Ok(new { message = "Message received and email sent!" });
            }
            catch (Exception smtpEx)
            {
                _logger.LogWarning(smtpEx, "> ⚠️ Email send failed: {Message}. Message logged.", smtpEx.Message);
                return Ok(new { message = "Message received successfully!" });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "> ❌ Contact form error");
            return StatusCode(500, "Failed to process contact form.");
        }
    }
}
