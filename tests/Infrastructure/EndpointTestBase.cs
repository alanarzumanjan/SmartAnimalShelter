using System.Net.Http.Json;
using System.Text.Json;
using Models;

namespace tests.Infrastructure;

public abstract class EndpointTestBase : IAsyncLifetime
{
    protected readonly TestApiFactory Factory = new();

    public Task InitializeAsync() => Factory.InitializeAsync();

    public async Task DisposeAsync() => await Factory.DisposeAsync();

    protected static async Task<JsonElement> ReadJsonAsync(HttpResponseMessage response)
    {
        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        return content;
    }

    protected static string? GetCookie(HttpResponseMessage response, string cookieName)
    {
        if (!response.Headers.TryGetValues("Set-Cookie", out var values))
            return null;

        return values.FirstOrDefault(value => value.StartsWith($"{cookieName}=", StringComparison.OrdinalIgnoreCase));
    }

    protected static void SetCookie(HttpClient client, string setCookieHeader)
    {
        var cookie = setCookieHeader.Split(';', 2)[0];
        client.DefaultRequestHeaders.Remove("Cookie");
        client.DefaultRequestHeaders.Add("Cookie", cookie);
    }

    protected static async Task SetCsrfTokenAsync(HttpClient client)
    {
        var response = await client.GetAsync("/csrf-token");
        if (response.Headers.TryGetValues("X-CSRF-TOKEN", out var values))
        {
            client.DefaultRequestHeaders.Remove("X-CSRF-TOKEN");
            client.DefaultRequestHeaders.Add("X-CSRF-TOKEN", values.First());
        }
    }

    protected HttpClient CreateClient() => Factory.CreateClient();

    protected HttpClient CreateAuthenticatedClient(Guid userId, UserRole role) =>
        Factory.CreateAuthenticatedClient(userId, role);
}
