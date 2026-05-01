using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Models;
using tests.Infrastructure;

namespace tests;

public class AuthTests : EndpointTestBase
{
    [Fact]
    public async Task Register_WithValidPayload_ReturnsAccessToken_AndPersistsUser()
    {
        var client = CreateClient();

        var response = await client.PostAsJsonAsync("/register", new
        {
            name = "newuser",
            email = "newuser@test.com",
            password = "SecurePass123!",
            role = "user"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await ReadJsonAsync(response);
        Assert.False(string.IsNullOrWhiteSpace(json.GetProperty("accessToken").GetString()));
        Assert.Equal("newuser", json.GetProperty("user").GetProperty("name").GetString());
        Assert.NotNull(GetCookie(response, "refresh_token"));

        var storedUser = await Factory.ExecuteDbContextAsync(db =>
            Task.FromResult(db.Users.Single(u => u.Username == "newuser")));

        Assert.Equal(UserRole.user, storedUser.Role);
        Assert.NotEqual("newuser@test.com", storedUser.Email);
    }

    [Fact]
    public async Task Register_WithShelterRole_CreatesShelter()
    {
        var client = CreateClient();

        var response = await client.PostAsJsonAsync("/register", new
        {
            name = "shelteruser",
            email = "shelteruser@test.com",
            password = "SecurePass123!",
            role = "shelter"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var createdShelter = await Factory.ExecuteDbContextAsync(db =>
            Task.FromResult(db.Shelters.SingleOrDefault(s => s.Owner.Username == "shelteruser")));

        Assert.NotNull(createdShelter);
        Assert.Equal("shelteruser's Shelter", createdShelter!.Name);
    }

    [Fact]
    public async Task Register_WithDuplicateUsername_ReturnsBadRequest()
    {
        await Factory.SeedUserAsync("takenuser", "first@test.com", "SecurePass123!");
        var client = CreateClient();

        var response = await client.PostAsJsonAsync("/register", new
        {
            name = "takenuser",
            email = "second@test.com",
            password = "SecurePass123!"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("Username already exists", body);
    }

    [Fact]
    public async Task Login_WithValidCredentials_ReturnsAccessToken_AndRefreshCookie()
    {
        await Factory.SeedUserAsync("loginuser", "login@test.com", "SecurePass123!");
        var client = CreateClient();

        var response = await client.PostAsJsonAsync("/login", new
        {
            email = "login@test.com",
            password = "SecurePass123!"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await ReadJsonAsync(response);
        Assert.False(string.IsNullOrWhiteSpace(json.GetProperty("accessToken").GetString()));
        Assert.Equal("loginuser", json.GetProperty("name").GetString());
        Assert.Equal("login@test.com", json.GetProperty("email").GetString());
        Assert.NotNull(GetCookie(response, "refresh_token"));
    }

    [Fact]
    public async Task Login_WithWrongPassword_ReturnsUnauthorized()
    {
        await Factory.SeedUserAsync("wrongpass", "wrongpass@test.com", "SecurePass123!");
        var client = CreateClient();

        var response = await client.PostAsJsonAsync("/login", new
        {
            email = "wrongpass@test.com",
            password = "WrongPassword123!"
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Refresh_WithRefreshCookie_ReturnsNewAccessToken()
    {
        await Factory.SeedUserAsync("refreshuser", "refresh@test.com", "SecurePass123!");

        var loginClient = CreateClient();
        var loginResponse = await loginClient.PostAsJsonAsync("/login", new
        {
            email = "refresh@test.com",
            password = "SecurePass123!"
        });

        var refreshCookie = GetCookie(loginResponse, "refresh_token");
        Assert.NotNull(refreshCookie);

        var refreshClient = CreateClient();
        SetCookie(refreshClient, refreshCookie!);

        var response = await refreshClient.PostAsync("/refresh", JsonContent.Create(new { }));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await ReadJsonAsync(response);
        Assert.False(string.IsNullOrWhiteSpace(json.GetProperty("accessToken").GetString()));
    }

    [Fact]
    public async Task Logout_ClearsRefreshCookie()
    {
        // First seed a user and get authenticated client with JWT token
        var userId = await Factory.SeedUserAsync("logoutuser", "logout@test.com", "SecurePass123!");
        var client = CreateAuthenticatedClient(userId, UserRole.user);

        var response = await client.PostAsync("/logout", JsonContent.Create(new { }));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var cookie = GetCookie(response, "refresh_token");
        Assert.NotNull(cookie);
        Assert.Contains("expires=", cookie!, StringComparison.OrdinalIgnoreCase);
    }
}

public class UserEndpointTests : EndpointTestBase
{
    [Fact]
    public async Task GetMe_WithAuthenticatedUser_ReturnsDecryptedProfile()
    {
        var userId = await Factory.SeedUserAsync("profileuser", "profile@test.com", "SecurePass123!", phone: "+37100000000");
        var client = CreateAuthenticatedClient(userId, UserRole.user);

        var response = await client.GetAsync("/users/me");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await ReadJsonAsync(response);
        Assert.Equal("profileuser", json.GetProperty("username").GetString());
        Assert.Equal("profile@test.com", json.GetProperty("email").GetString());
        Assert.Equal("+37100000000", json.GetProperty("phone").GetString());
    }

    [Fact]
    public async Task Patch_WithCurrentUser_UpdatesProfile()
    {
        var userId = await Factory.SeedUserAsync("patchme", "patchme@test.com", "SecurePass123!");
        var client = CreateAuthenticatedClient(userId, UserRole.user);

        var response = await client.PatchAsJsonAsync($"/users/{userId}", new
        {
            name = "patched",
            email = "patched@test.com",
            address = "Updated address"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var updated = await Factory.ExecuteDbContextAsync(db => Task.FromResult(db.Users.Single(u => u.Id == userId)));
        Assert.Equal("patched", updated.Username);
        Assert.Equal("Updated address", updated.Address);
    }

    [Fact]
    public async Task Patch_WithDifferentUser_ReturnsForbidden()
    {
        var ownerId = await Factory.SeedUserAsync("owner", "owner@test.com", "SecurePass123!");
        var strangerId = await Factory.SeedUserAsync("stranger", "stranger@test.com", "SecurePass123!");
        var client = CreateAuthenticatedClient(strangerId, UserRole.user);

        var response = await client.PatchAsJsonAsync($"/users/{ownerId}", new
        {
            name = "hacked"
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task UpdatePassword_WithCorrectCurrentPassword_ChangesPasswordHash()
    {
        var userId = await Factory.SeedUserAsync("passworduser", "password@test.com", "SecurePass123!");
        var client = CreateAuthenticatedClient(userId, UserRole.user);

        var response = await client.PatchAsJsonAsync($"/users/{userId}/password", new
        {
            currentPassword = "SecurePass123!",
            newPassword = "NewSecurePass123!"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var loginResponse = await CreateClient().PostAsJsonAsync("/login", new
        {
            email = "password@test.com",
            password = "NewSecurePass123!"
        });

        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);
    }
}
