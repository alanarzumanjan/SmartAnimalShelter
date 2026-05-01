using System.Net;
using System.Net.Http.Json;
using Models;
using tests.Infrastructure;

namespace tests;

public class PetsTests : EndpointTestBase
{
    [Fact]
    public async Task GetAll_ReturnsPaginatedPets()
    {
        var ownerId = await Factory.SeedUserAsync("shelterowner", "shelterowner@test.com", "SecurePass123!", UserRole.shelter);
        var shelterId = await Factory.SeedShelterAsync(ownerId);
        await Factory.SeedPetAsync(shelterId, "Buddy");
        await Factory.SeedPetAsync(shelterId, "Max");
        var client = CreateClient();

        var response = await client.GetAsync($"/pets?shelterId={shelterId}&page=1&pageSize=10");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await ReadJsonAsync(response);
        Assert.Equal(2, json.GetProperty("totalCount").GetInt32());
        Assert.Equal(2, json.GetProperty("pets").GetArrayLength());
    }

    [Fact]
    public async Task GetById_WithUnknownPet_ReturnsNotFound()
    {
        var client = CreateClient();

        var response = await client.GetAsync($"/pets/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Create_WithShelterUser_CreatesPet()
    {
        var userId = await Factory.SeedUserAsync("creator", "creator@test.com", "SecurePass123!", UserRole.shelter);
        var client = CreateAuthenticatedClient(userId, UserRole.shelter);

        var response = await client.PostAsJsonAsync("/pets", new
        {
            name = "Created Pet",
            speciesId = 1,
            breedId = 1,
            genderId = 1,
            statusId = 1,
            shelterId = Guid.Empty
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var created = await Factory.ExecuteDbContextAsync(db =>
            Task.FromResult(db.Pets.Single(p => p.Name == "Created Pet")));

        Assert.Equal(1, created.SpeciesId);
    }

    [Fact]
    public async Task Patch_ByShelterOwner_UpdatesPet()
    {
        var ownerId = await Factory.SeedUserAsync("ownerpatch", "ownerpatch@test.com", "SecurePass123!", UserRole.shelter);
        var shelterId = await Factory.SeedShelterAsync(ownerId);
        var petId = await Factory.SeedPetAsync(shelterId, "Patchable");
        var client = CreateAuthenticatedClient(ownerId, UserRole.shelter);

        var response = await client.PatchAsJsonAsync($"/pets/{petId}", new
        {
            name = "Updated Pet",
            description = "Updated description"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var updated = await Factory.ExecuteDbContextAsync(db => Task.FromResult(db.Pets.Single(p => p.Id == petId)));
        Assert.Equal("Updated Pet", updated.Name);
        Assert.Equal("Updated description", updated.Description);
    }

    [Fact]
    public async Task Patch_ByAnotherShelterUser_ReturnsForbidden()
    {
        var ownerId = await Factory.SeedUserAsync("realowner", "realowner@test.com", "SecurePass123!", UserRole.shelter);
        var strangerId = await Factory.SeedUserAsync("strangerowner", "strangerowner@test.com", "SecurePass123!", UserRole.shelter);
        var shelterId = await Factory.SeedShelterAsync(ownerId);
        var petId = await Factory.SeedPetAsync(shelterId, "Protected");
        var client = CreateAuthenticatedClient(strangerId, UserRole.shelter);

        var response = await client.PatchAsJsonAsync($"/pets/{petId}", new
        {
            name = "Should Fail"
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Delete_ByShelterOwner_RemovesPet()
    {
        var ownerId = await Factory.SeedUserAsync("deleteowner", "deleteowner@test.com", "SecurePass123!", UserRole.shelter);
        var shelterId = await Factory.SeedShelterAsync(ownerId);
        var petId = await Factory.SeedPetAsync(shelterId, "DeleteMe");
        var client = CreateAuthenticatedClient(ownerId, UserRole.shelter);

        var response = await client.DeleteAsync($"/pets/{petId}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var exists = await Factory.ExecuteDbContextAsync(db => Task.FromResult(db.Pets.Any(p => p.Id == petId)));
        Assert.False(exists);
    }
}

public class AdoptionTests : EndpointTestBase
{
    [Fact]
    public async Task CreateAdoptionRequest_WithAuthenticatedUser_CreatesPendingRequest()
    {
        var userId = await Factory.SeedUserAsync("adopter", "adopter@test.com", "SecurePass123!");
        var shelterOwnerId = await Factory.SeedUserAsync("shelterforadoption", "shelterforadoption@test.com", "SecurePass123!", UserRole.shelter);
        var shelterId = await Factory.SeedShelterAsync(shelterOwnerId);
        var petId = await Factory.SeedPetAsync(shelterId, "AdoptMe");
        var client = CreateAuthenticatedClient(userId, UserRole.user);

        var response = await client.PostAsJsonAsync("/pets/adoption", new
        {
            petId,
            message = "I can give this pet a good home."
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var request = await Factory.ExecuteDbContextAsync(db =>
            Task.FromResult(db.AdoptionRequests.Single(a => a.PetId == petId && a.UserId == userId)));

        Assert.Equal(AdoptionRequestStatus.pending, request.Status);
    }

    [Fact]
    public async Task CreateAdoptionRequest_WhenPendingAlreadyExists_ReturnsBadRequest()
    {
        var userId = await Factory.SeedUserAsync("repeatadopter", "repeatadopter@test.com", "SecurePass123!");
        var shelterOwnerId = await Factory.SeedUserAsync("repeatowner", "repeatowner@test.com", "SecurePass123!", UserRole.shelter);
        var shelterId = await Factory.SeedShelterAsync(shelterOwnerId);
        var petId = await Factory.SeedPetAsync(shelterId, "RepeatPet");

        await Factory.ExecuteDbContextAsync(async db =>
        {
            db.AdoptionRequests.Add(new AdoptionRequest
            {
                PetId = petId,
                UserId = userId,
                Message = "Existing request",
                Status = AdoptionRequestStatus.pending
            });
            await db.SaveChangesAsync();
        });

        var client = CreateAuthenticatedClient(userId, UserRole.user);

        var response = await client.PostAsJsonAsync("/pets/adoption", new
        {
            petId,
            message = "Second try"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UpdateAdoptionStatus_WithUserRole_ReturnsForbidden()
    {
        var userId = await Factory.SeedUserAsync("normaluser", "normaluser@test.com", "SecurePass123!");
        var shelterOwnerId = await Factory.SeedUserAsync("statusowner", "statusowner@test.com", "SecurePass123!", UserRole.shelter);
        var shelterId = await Factory.SeedShelterAsync(shelterOwnerId);
        var petId = await Factory.SeedPetAsync(shelterId, "ApprovalPet");

        var adoptionId = await Factory.ExecuteDbContextAsync(async db =>
        {
            var request = new AdoptionRequest
            {
                PetId = petId,
                UserId = userId,
                Message = "Please approve",
                Status = AdoptionRequestStatus.pending
            };
            db.AdoptionRequests.Add(request);
            await db.SaveChangesAsync();
            return request.Id;
        });

        var client = CreateAuthenticatedClient(userId, UserRole.user);

        var response = await client.PatchAsJsonAsync($"/pets/adoption/{adoptionId}/status", new
        {
            status = "approved"
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task UpdateAdoptionStatus_WithShelterRole_UpdatesStatus()
    {
        var userId = await Factory.SeedUserAsync("adoptioncandidate", "adoptioncandidate@test.com", "SecurePass123!");
        var shelterOwnerId = await Factory.SeedUserAsync("approver", "approver@test.com", "SecurePass123!", UserRole.shelter);
        var shelterId = await Factory.SeedShelterAsync(shelterOwnerId);
        var petId = await Factory.SeedPetAsync(shelterId, "ApprovePet");

        var adoptionId = await Factory.ExecuteDbContextAsync(async db =>
        {
            var request = new AdoptionRequest
            {
                PetId = petId,
                UserId = userId,
                Message = "Please approve",
                Status = AdoptionRequestStatus.pending
            };
            db.AdoptionRequests.Add(request);
            await db.SaveChangesAsync();
            return request.Id;
        });

        var client = CreateAuthenticatedClient(shelterOwnerId, UserRole.shelter);

        var response = await client.PatchAsJsonAsync($"/pets/adoption/{adoptionId}/status", new
        {
            status = "approved"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var updated = await Factory.ExecuteDbContextAsync(db => Task.FromResult(db.AdoptionRequests.Single(a => a.Id == adoptionId)));
        Assert.Equal(AdoptionRequestStatus.approved, updated.Status);
    }
}
