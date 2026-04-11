using System.Net;
using System.Text;

public class SwaggerAuth
{
    private readonly RequestDelegate _next;
    private readonly string? _username;
    private readonly string? _password;

    public SwaggerAuth(RequestDelegate next)
    {
        _next = next;
        _username = Environment.GetEnvironmentVariable("SWAGGER_ADMIN_LOGIN");
        _password = Environment.GetEnvironmentVariable("SWAGGER_ADMIN_PASSWORD");
    }

    public async Task Invoke(HttpContext context)
    {
        if (context.Request.Path.StartsWithSegments("/swagger"))
        {
            string? authHeader = context.Request.Headers["Authorization"];
            if (authHeader != null && authHeader.StartsWith("Basic "))
            {
                string encoded = authHeader.Substring("Basic".Length).Trim();
                string decoded = Encoding.UTF8.GetString(Convert.FromBase64String(encoded));
                string[] credentials = decoded.Split(':');

                if (credentials.Length == 2 && credentials[0] == _username
                    && credentials[1] == _password)
                {
                    await _next.Invoke(context);
                    return;
                }
            }
            context.Response.Headers["WWW-Authenticate"] = "Basic";
            context.Response.StatusCode = (int)HttpStatusCode.Unauthorized;
            await context.Response.WriteAsync("Unauthorized");
        }
        else
        {
            await _next.Invoke(context);
        }
    }
}