using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Models;
using tests.Infrastructure;

namespace tests;

public class DevicesTests : EndpointTestBase
{
    private const string Mac = "AA:BB:CC:DD:EE:FF";

    [Fact]
    public async Task Register_WithValidPayload_ReturnsRegisteredDevice()
    {
        var userId = await Factory.SeedUserAsync("deviceowner", "deviceowner@test.com", "SecurePass123!");
        var client = CreateAuthenticatedClient(userId, UserRole.user);

        var response = await client.PostAsJsonAsync("/devices/register", new
        {
            id = Mac,
            name = "Kitchen Sensor",
            location = "Kitchen"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await ReadJsonAsync(response);
        Assert.Equal(Mac, json.GetProperty("data").GetProperty("deviceId").GetString());
    }

    [Fact]
    public async Task Register_WithInvalidMac_ReturnsBadRequest()
    {
        var userId = await Factory.SeedUserAsync("invalidmac", "invalidmac@test.com", "SecurePass123!");
        var client = CreateAuthenticatedClient(userId, UserRole.user);

        var response = await client.PostAsJsonAsync("/devices/register", new
        {
            id = "invalid",
            name = "Broken Device",
            location = "Office"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Register_WithDuplicateMac_ReturnsConflict()
    {
        var userId = await Factory.SeedUserAsync("duplicatemac", "duplicatemac@test.com", "SecurePass123!");
        await Factory.SeedDeviceAsync(userId, Mac, "Existing Device", "Office");
        var client = CreateAuthenticatedClient(userId, UserRole.user);

        var response = await client.PostAsJsonAsync("/devices/register", new
        {
            id = Mac,
            name = "Another Device",
            location = "Bedroom"
        });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task GetByUser_ForDifferentUser_ReturnsForbidden()
    {
        var ownerId = await Factory.SeedUserAsync("ownerdevice", "ownerdevice@test.com", "SecurePass123!");
        var strangerId = await Factory.SeedUserAsync("strangerdevice", "strangerdevice@test.com", "SecurePass123!");
        await Factory.SeedDeviceAsync(ownerId, Mac);
        var client = CreateAuthenticatedClient(strangerId, UserRole.user);

        var response = await client.GetAsync($"/devices/user/{ownerId}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetOne_ForOwner_ReturnsDevice()
    {
        var userId = await Factory.SeedUserAsync("deviceviewer", "deviceviewer@test.com", "SecurePass123!");
        await Factory.SeedDeviceAsync(userId, Mac, "Living Room Sensor", "Living Room");
        var client = CreateAuthenticatedClient(userId, UserRole.user);

        var response = await client.GetAsync($"/devices/id/{Mac}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await ReadJsonAsync(response);
        Assert.Equal("Living Room Sensor", json.GetProperty("data").GetProperty("name").GetString());
    }

    [Fact]
    public async Task Update_ForOwner_ReturnsUpdatedDevice()
    {
        var userId = await Factory.SeedUserAsync("deviceeditor", "deviceeditor@test.com", "SecurePass123!");
        await Factory.SeedDeviceAsync(userId, Mac, "Old Name", "Old Location");
        var client = CreateAuthenticatedClient(userId, UserRole.user);

        var response = await client.PutAsJsonAsync($"/devices/{Mac}", new
        {
            name = "New Name",
            location = "New Location"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var updated = await Factory.ExecuteDbContextAsync(db =>
            Task.FromResult(db.Devices.Single(d => d.DeviceId == Mac)));

        Assert.Equal("New Name", updated.Name);
        Assert.Equal("New Location", updated.Location);
    }
}

public class DeviceUsersTests : EndpointTestBase
{
    private const string Mac = "11:22:33:44:55:66";

    [Fact]
    public async Task Login_WithValidCredentials_IssuesDeviceKey()
    {
        var userId = await Factory.SeedUserAsync("iotuser", "iotuser@test.com", "SecurePass123!");
        await Factory.SeedDeviceAsync(userId, Mac, "IoT Device", "Unknown");
        var client = CreateClient();

        var response = await client.PostAsJsonAsync("/device-users/login", new
        {
            mac = Mac,
            email = "iotuser@test.com",
            password = "SecurePass123!"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await ReadJsonAsync(response);
        Assert.True(json.GetProperty("keyIssued").GetBoolean());
        Assert.False(string.IsNullOrWhiteSpace(json.GetProperty("deviceKey").GetString()));
    }

    [Fact]
    public async Task Login_WhenKeyAlreadyExists_DoesNotIssueSecondKey()
    {
        var userId = await Factory.SeedUserAsync("existingkey", "existingkey@test.com", "SecurePass123!");

        await Factory.ExecuteDbContextAsync(async db =>
        {
            db.Devices.Add(new Device
            {
                Id = Guid.NewGuid(),
                DeviceId = Mac,
                Name = "IoT Device",
                Location = "Unknown",
                UserId = userId
            });
            db.DeviceUsers.Add(new DeviceUser
            {
                Id = Guid.NewGuid(),
                DeviceId = Mac,
                UserId = userId,
                ApiKeyHash = BCrypt.Net.BCrypt.HashPassword("existing-key")
            });
            await db.SaveChangesAsync();
        });

        var client = CreateClient();

        var response = await client.PostAsJsonAsync("/device-users/login", new
        {
            mac = Mac,
            email = "existingkey@test.com",
            password = "SecurePass123!"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await ReadJsonAsync(response);
        Assert.False(json.GetProperty("keyIssued").GetBoolean());
        Assert.Equal(JsonValueKind.Null, json.GetProperty("deviceKey").ValueKind);
    }

    [Fact]
    public async Task Enroll_ForCurrentUser_ReturnsEnrollmentKey()
    {
        var userId = await Factory.SeedUserAsync("enrolluser", "enrolluser@test.com", "SecurePass123!");
        var client = CreateAuthenticatedClient(userId, UserRole.user);

        var response = await client.PostAsJsonAsync("/device-users/enroll", new
        {
            deviceId = Mac,
            userId
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await ReadJsonAsync(response);
        Assert.False(string.IsNullOrWhiteSpace(json.GetProperty("deviceKey").GetString()));
    }

    [Fact]
    public async Task Enroll_ForDifferentUser_ReturnsForbidden()
    {
        var ownerId = await Factory.SeedUserAsync("ownerenroll", "ownerenroll@test.com", "SecurePass123!");
        var strangerId = await Factory.SeedUserAsync("strangerenroll", "strangerenroll@test.com", "SecurePass123!");
        var client = CreateAuthenticatedClient(strangerId, UserRole.user);

        var response = await client.PostAsJsonAsync("/device-users/enroll", new
        {
            deviceId = Mac,
            userId = ownerId
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
