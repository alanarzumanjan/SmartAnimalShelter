using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using MimeKit;
using MailKit.Net.Smtp;

[ApiController]
[Route("[controller]")]
public class ContactsController : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult> SendMessage([FromBody] ContactsDTO form)
    {
        try
        {
            var emailPattern = @"^[^@\s]+@[^@\s]+\.[^@\s]+$";
            if (!string.IsNullOrEmpty(form.Email) && !Regex.IsMatch(form.Email, emailPattern))
            {
                Console.WriteLine($"Contacts email send: Invalid email format {form.Email}");
                return BadRequest("Invalid email format.");
            }

            var emailEnv = Environment.GetEnvironmentVariable("EMAIL_ADDRESS");
            var passwordEnv = Environment.GetEnvironmentVariable("EMAIL_PASSWORD");
            var nameEnv = Environment.GetEnvironmentVariable("EMAIL_NAME") ?? "Iot meter Support Team";

            Console.WriteLine($"📧 Contact form received from {form.Email}: {form.Message}");

            // Check if email is configured
            if (string.IsNullOrEmpty(emailEnv) || string.IsNullOrEmpty(passwordEnv))
            {
                Console.WriteLine($"⚠️  Email not configured. Message saved to logs.");
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

                Console.WriteLine($"✅ Email notification sent to {emailEnv}");
                return Ok(new { message = "Message received and email sent!" });
            }
            catch (Exception smtpEx)
            {
                Console.WriteLine($"⚠️  Email send failed: {smtpEx.Message}. Message logged.");
                return Ok(new { message = "Message received successfully!" });
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Contact form error: {ex.Message}");
            return StatusCode(500, "Failed to process contact form.");
        }
    }
}