using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    public partial class AddPetExtendedFields : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>("MedicalNotes", "Pets", maxLength: 2000, nullable: true);
            migrationBuilder.AddColumn<string>("IdealHome", "Pets", maxLength: 1000, nullable: true);
            migrationBuilder.AddColumn<string>("SpecialNeeds", "Pets", maxLength: 1000, nullable: true);
            migrationBuilder.AddColumn<string>("CurrentMedications", "Pets", maxLength: 500, nullable: true);
            migrationBuilder.AddColumn<string>("IntakeReason", "Pets", maxLength: 1000, nullable: true);
            migrationBuilder.AddColumn<DateTime?>("IntakeDate", "Pets", nullable: true);
            migrationBuilder.AddColumn<float?>("Weight", "Pets", nullable: true);
            migrationBuilder.AddColumn<string>("Size", "Pets", maxLength: 20, nullable: true);
            migrationBuilder.AddColumn<string>("EnergyLevel", "Pets", maxLength: 20, nullable: true);
            migrationBuilder.AddColumn<string>("ExperienceLevel", "Pets", maxLength: 20, nullable: true);
            migrationBuilder.AddColumn<string>("HousingRequirement", "Pets", maxLength: 20, nullable: true);
            migrationBuilder.AddColumn<bool?>("IsNeutered", "Pets", nullable: true);
            migrationBuilder.AddColumn<bool?>("IsChipped", "Pets", nullable: true);
            migrationBuilder.AddColumn<string>("ChipNumber", "Pets", maxLength: 100, nullable: true);
            migrationBuilder.AddColumn<bool?>("IsHouseTrained", "Pets", nullable: true);
            migrationBuilder.AddColumn<bool?>("GoodWithKids", "Pets", nullable: true);
            migrationBuilder.AddColumn<bool?>("GoodWithDogs", "Pets", nullable: true);
            migrationBuilder.AddColumn<bool?>("GoodWithCats", "Pets", nullable: true);
            migrationBuilder.AddColumn<decimal?>("AdoptionFee", "Pets", nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn("MedicalNotes", "Pets");
            migrationBuilder.DropColumn("IdealHome", "Pets");
            migrationBuilder.DropColumn("SpecialNeeds", "Pets");
            migrationBuilder.DropColumn("CurrentMedications", "Pets");
            migrationBuilder.DropColumn("IntakeReason", "Pets");
            migrationBuilder.DropColumn("IntakeDate", "Pets");
            migrationBuilder.DropColumn("Weight", "Pets");
            migrationBuilder.DropColumn("Size", "Pets");
            migrationBuilder.DropColumn("EnergyLevel", "Pets");
            migrationBuilder.DropColumn("ExperienceLevel", "Pets");
            migrationBuilder.DropColumn("HousingRequirement", "Pets");
            migrationBuilder.DropColumn("IsNeutered", "Pets");
            migrationBuilder.DropColumn("IsChipped", "Pets");
            migrationBuilder.DropColumn("ChipNumber", "Pets");
            migrationBuilder.DropColumn("IsHouseTrained", "Pets");
            migrationBuilder.DropColumn("GoodWithKids", "Pets");
            migrationBuilder.DropColumn("GoodWithDogs", "Pets");
            migrationBuilder.DropColumn("GoodWithCats", "Pets");
            migrationBuilder.DropColumn("AdoptionFee", "Pets");
        }
    }
}
