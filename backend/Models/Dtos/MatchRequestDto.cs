using System.Collections.Generic;

namespace Dtos;

public class MatchRequestDto
{
    public string HousingType { get; set; } = "";

    public bool HasKids { get; set; }
    public bool HasDogs { get; set; }
    public bool HasCats { get; set; }

    public string EnergyPreference { get; set; } = "";

    public string ExperienceLevel { get; set; } = "";

    public string SizePreference { get; set; } = "any";

    public bool NeedsHouseTrained { get; set; }
}

