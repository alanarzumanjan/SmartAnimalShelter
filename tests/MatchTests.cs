using tests.Infrastructure;
using System.Net.Http.Json;
using System.Net;
using Services;
using Models;
using Dtos;

namespace tests;

public class CompatibilityScorerTests
{
    private static Pet MakePet(
        string? housing = null,
        bool? goodWithKids = null,
        bool? goodWithDogs = null,
        bool? goodWithCats = null,
        string? energy = null) => new()
        {
            Id = Guid.NewGuid(),
            Name = "TestPet",
            SpeciesId = 1,
            StatusId = 1,
            ShelterId = Guid.NewGuid(),
            HousingRequirement = housing,
            GoodWithKids = goodWithKids,
            GoodWithDogs = goodWithDogs,
            GoodWithCats = goodWithCats,
            EnergyLevel = energy,
        };

    private static MatchRequestDto DefaultPrefs() => new()
    {
        HousingType = "apartment",
        HasKids = false,
        HasDogs = false,
        HasCats = false,
        EnergyPreference = "medium",
        ExperienceLevel = "first_time",
        SizePreference = "any",
        NeedsHouseTrained = false,
    };

    [Fact]
    public void Score_AllFieldsMatch_Returns100()
    {
        var pet = MakePet(housing: "apartment", goodWithKids: true, goodWithDogs: true, goodWithCats: true, energy: "medium");
        pet.ExperienceLevel = "first_time";
        pet.Size = "medium";
        pet.IsHouseTrained = true;
        var prefs = new MatchRequestDto
        {
            HousingType = "apartment",
            HasKids = true,
            HasDogs = true,
            HasCats = true,
            EnergyPreference = "medium",
            ExperienceLevel = "first_time",
            SizePreference = "medium",
            NeedsHouseTrained = true,
        };

        var (score, reasons) = PetCompatibilityScorer.Score(pet, prefs);

        Assert.Equal(100, score);
        Assert.Contains("Suits your home type", reasons);
        Assert.Contains("Good with kids", reasons);
        Assert.Contains("Good with dogs", reasons);
        Assert.Contains("Good with cats", reasons);
        Assert.Contains("Energy level matches", reasons);
        Assert.Contains("Great for first-time owners", reasons);
        Assert.Contains("Size matches your preference", reasons);
        Assert.Contains("Already house trained", reasons);
    }

    [Fact]
    public void Score_HousingMismatch_WithAllConstraints_ReturnsLowScore()
    {
        var pet = MakePet(housing: "house_with_yard", goodWithKids: false, goodWithDogs: false, goodWithCats: false, energy: "high");
        var prefs = new MatchRequestDto
        {
            HousingType = "apartment",
            HasKids = true,
            HasDogs = true,
            HasCats = true,
            EnergyPreference = "low",
            ExperienceLevel = "first_time",
            SizePreference = "any",
            NeedsHouseTrained = false,
        };

        var (score, _) = PetCompatibilityScorer.Score(pet, prefs);

        Assert.True(score <= 20);
    }

    [Fact]
    public void Score_NoConstraintsFromAdopter_ReturnsHighScore()
    {
        var pet = MakePet(housing: "apartment", energy: "low");
        var prefs = DefaultPrefs();

        var (score, _) = PetCompatibilityScorer.Score(pet, prefs);
        Assert.Equal(94, score);
    }

    [Fact]
    public void Score_NullTraits_GivePartialCredit()
    {
        var pet = MakePet(goodWithKids: null, goodWithDogs: null, goodWithCats: null);
        var prefs = new MatchRequestDto
        {
            HousingType = "apartment",
            HasKids = true,
            HasDogs = true,
            HasCats = true,
            EnergyPreference = "medium",
            ExperienceLevel = "first_time",
            SizePreference = "any",
            NeedsHouseTrained = false,
        };

        var (score, _) = PetCompatibilityScorer.Score(pet, prefs);

        Assert.Equal(70, score);
    }

    [Fact]
    public void Score_HouseWithYard_CompatibleWithHouse()
    {
        var pet = MakePet(housing: "house");
        var prefs = new MatchRequestDto { HousingType = "house_with_yard", EnergyPreference = "medium" };

        var (score, reasons) = PetCompatibilityScorer.Score(pet, prefs);

        Assert.Contains("Suits your home type", reasons);
        Assert.True(score >= 25);
    }

    [Fact]
    public void Score_ApartmentPet_IncompatibleWithHouse()
    {
        var pet = MakePet(housing: "apartment");
        var prefs = new MatchRequestDto { HousingType = "house", EnergyPreference = "medium" };

        var (score, reasons) = PetCompatibilityScorer.Score(pet, prefs);

        Assert.DoesNotContain("Suits your home type", reasons);
        Assert.True(score <= 75); // lost 25 housing points
    }

    [Fact]
    public void Score_EnergyAdjacentLevel_GivesHalfPoints()
    {
        var pet = MakePet(energy: "low");
        var prefs = new MatchRequestDto
        {
            HousingType = "apartment",
            EnergyPreference = "medium",
            ExperienceLevel = "first_time",
            SizePreference = "any",
        };

        var (score, _) = PetCompatibilityScorer.Score(pet, prefs);

        Assert.Equal(94, score);
    }

    [Fact]
    public void Score_EnergyOpposite_GivesZeroPoints()
    {
        var pet = MakePet(energy: "high");
        var prefs = new MatchRequestDto
        {
            HousingType = "apartment",
            EnergyPreference = "low",
            ExperienceLevel = "first_time",
            SizePreference = "any",
        };

        var (score, _) = PetCompatibilityScorer.Score(pet, prefs);

        Assert.Equal(88, score);
    }

    [Fact]
    public void ScoreAndSort_ReturnsPetsInDescendingOrder()
    {
        var prefs = new MatchRequestDto
        {
            HousingType = "apartment",
            HasKids = true,
            HasDogs = false,
            HasCats = false,
            EnergyPreference = "low",
        };

        var pets = new List<Pet>
        {
            MakePet(housing: "house_with_yard", goodWithKids: false, energy: "high"), // low score
            MakePet(housing: "apartment", goodWithKids: true,  energy: "low"),  // high score
            MakePet(housing: "apartment", goodWithKids: null,  energy: "medium"), // mid score
        };

        var results = PetCompatibilityScorer.ScoreAndSort(pets, prefs);

        Assert.Equal(3, results.Count);
        Assert.True(results[0].CompatibilityScore >= results[1].CompatibilityScore);
        Assert.True(results[1].CompatibilityScore >= results[2].CompatibilityScore);
    }

    [Fact]
    public void ScoreAndSort_EmptyList_ReturnsEmpty()
    {
        var results = PetCompatibilityScorer.ScoreAndSort([], DefaultPrefs());
        Assert.Empty(results);
    }

    [Fact]
    public void Score_ExperiencedPet_WithFirstTimeAdopter_GivesZeroExperiencePoints()
    {
        var pet = MakePet();
        pet.ExperienceLevel = "experienced";
        var prefs = DefaultPrefs(); // DefaultPrefs has ExperienceLevel = "first_time"

        var (score, reasons) = PetCompatibilityScorer.Score(pet, prefs);

        Assert.DoesNotContain("Matches your experience", reasons);
        Assert.DoesNotContain("Great for first-time owners", reasons);
        // Score should be lower than if experience matched
        var petGood = MakePet();
        petGood.ExperienceLevel = "first_time";
        var (scoreGood, _) = PetCompatibilityScorer.Score(petGood, prefs);
        Assert.True(scoreGood > score);
    }

    [Fact]
    public void Score_ExperiencedAdopter_AlwaysGetsFullExperiencePoints()
    {
        var pet = MakePet();
        pet.ExperienceLevel = "experienced";
        var prefs = new MatchRequestDto
        {
            HousingType = "apartment",
            EnergyPreference = "medium",
            ExperienceLevel = "experienced",
            SizePreference = "any",
        };

        var (_, reasons) = PetCompatibilityScorer.Score(pet, prefs);
        Assert.Contains("Matches your experience", reasons);
    }

    [Fact]
    public void Score_SizeMatch_GivesFullPoints()
    {
        var pet = MakePet();
        pet.Size = "small";
        var prefs = new MatchRequestDto
        {
            HousingType = "apartment",
            EnergyPreference = "medium",
            ExperienceLevel = "first_time",
            SizePreference = "small",
        };

        var (_, reasons) = PetCompatibilityScorer.Score(pet, prefs);
        Assert.Contains("Size matches your preference", reasons);
    }

    [Fact]
    public void Score_SizeAny_GivesFullPoints()
    {
        var pet = MakePet();
        pet.Size = "large";
        var prefs = DefaultPrefs(); // SizePreference = "any"

        var (score, _) = PetCompatibilityScorer.Score(pet, prefs);

        // "any" should not penalize any size
        var petSmall = MakePet();
        petSmall.Size = "small";
        var (scoreSmall, _) = PetCompatibilityScorer.Score(petSmall, prefs);
        Assert.Equal(scoreSmall, score);
    }

    [Fact]
    public void Score_HouseTrained_WhenRequired_GivesBonus()
    {
        var petTrained = MakePet(); petTrained.IsHouseTrained = true;
        var petUntrained = MakePet(); petUntrained.IsHouseTrained = false;
        var prefs = new MatchRequestDto
        {
            HousingType = "apartment",
            EnergyPreference = "medium",
            ExperienceLevel = "first_time",
            SizePreference = "any",
            NeedsHouseTrained = true,
        };

        var (scoreTrained, _) = PetCompatibilityScorer.Score(petTrained, prefs);
        var (scoreUntrained, _) = PetCompatibilityScorer.Score(petUntrained, prefs);

        Assert.True(scoreTrained > scoreUntrained);
    }
}

// Integration tests for POST /pets/match endpoint 

public class MatchEndpointTests : EndpointTestBase
{
    [Fact]
    public async Task Match_WithValidPreferences_Returns200AndSortedPets()
    {
        var ownerId = await Factory.SeedUserAsync("matchowner", "matchowner@test.com", "SecurePass123!", UserRole.shelter);
        var shelterId = await Factory.SeedShelterAsync(ownerId);
        await Factory.SeedPetAsync(shelterId, "BestMatch");
        await Factory.SeedPetAsync(shelterId, "OtherPet");

        var client = CreateClient();
        var response = await client.PostAsJsonAsync("/pets/match", new
        {
            housingType = "apartment",
            hasKids = false,
            hasDogs = false,
            hasCats = false,
            energyPreference = "medium",
            experienceLevel = "first_time",
            sizePreference = "any",
            needsHouseTrained = false,
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await ReadJsonAsync(response);
        var pets = json.GetProperty("pets");
        Assert.True(pets.GetArrayLength() >= 2);

        // Verify descending sort
        var scores = pets.EnumerateArray()
            .Select(p => p.GetProperty("compatibilityScore").GetInt32())
            .ToList();

        for (int i = 0; i < scores.Count - 1; i++)
            Assert.True(scores[i] >= scores[i + 1]);
    }

    [Fact]
    public async Task Match_WithInvalidHousingType_ReturnsBadRequest()
    {
        var client = CreateClient();
        var response = await client.PostAsJsonAsync("/pets/match", new
        {
            housingType = "castle",
            hasKids = false,
            hasDogs = false,
            hasCats = false,
            energyPreference = "medium",
            experienceLevel = "first_time",
            sizePreference = "any",
            needsHouseTrained = false,
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Match_WithInvalidEnergyPreference_ReturnsBadRequest()
    {
        var client = CreateClient();
        var response = await client.PostAsJsonAsync("/pets/match", new
        {
            housingType = "apartment",
            hasKids = false,
            hasDogs = false,
            hasCats = false,
            energyPreference = "extreme",
            experienceLevel = "first_time",
            sizePreference = "any",
            needsHouseTrained = false,
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Match_ResponseContainsCompatibilityScoreAndReasons()
    {
        var ownerId = await Factory.SeedUserAsync("scorechecker", "scorechecker@test.com", "SecurePass123!", UserRole.shelter);
        var shelterId = await Factory.SeedShelterAsync(ownerId);
        await Factory.SeedPetAsync(shelterId, "ScorePet");

        var client = CreateClient();
        var response = await client.PostAsJsonAsync("/pets/match", new
        {
            housingType = "apartment",
            hasKids = false,
            hasDogs = false,
            hasCats = false,
            energyPreference = "medium",
            experienceLevel = "first_time",
            sizePreference = "any",
            needsHouseTrained = false,
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await ReadJsonAsync(response);
        var firstPet = json.GetProperty("pets").EnumerateArray().First();

        Assert.True(firstPet.TryGetProperty("compatibilityScore", out var scoreEl));
        Assert.InRange(scoreEl.GetInt32(), 0, 100);

        Assert.True(firstPet.TryGetProperty("matchReasons", out _));
    }
}
