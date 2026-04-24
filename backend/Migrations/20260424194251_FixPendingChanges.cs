using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class FixPendingChanges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "AdoptionFee",
                table: "Pets",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ChipNumber",
                table: "Pets",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CurrentMedications",
                table: "Pets",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EnergyLevel",
                table: "Pets",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExperienceLevel",
                table: "Pets",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "GoodWithCats",
                table: "Pets",
                type: "boolean",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "GoodWithDogs",
                table: "Pets",
                type: "boolean",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "GoodWithKids",
                table: "Pets",
                type: "boolean",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "HousingRequirement",
                table: "Pets",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IdealHome",
                table: "Pets",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "IntakeDate",
                table: "Pets",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IntakeReason",
                table: "Pets",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsChipped",
                table: "Pets",
                type: "boolean",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsHouseTrained",
                table: "Pets",
                type: "boolean",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsNeutered",
                table: "Pets",
                type: "boolean",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MedicalNotes",
                table: "Pets",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Size",
                table: "Pets",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SpecialNeeds",
                table: "Pets",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<float>(
                name: "Weight",
                table: "Pets",
                type: "real",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AdoptionFee",
                table: "Pets");

            migrationBuilder.DropColumn(
                name: "ChipNumber",
                table: "Pets");

            migrationBuilder.DropColumn(
                name: "CurrentMedications",
                table: "Pets");

            migrationBuilder.DropColumn(
                name: "EnergyLevel",
                table: "Pets");

            migrationBuilder.DropColumn(
                name: "ExperienceLevel",
                table: "Pets");

            migrationBuilder.DropColumn(
                name: "GoodWithCats",
                table: "Pets");

            migrationBuilder.DropColumn(
                name: "GoodWithDogs",
                table: "Pets");

            migrationBuilder.DropColumn(
                name: "GoodWithKids",
                table: "Pets");

            migrationBuilder.DropColumn(
                name: "HousingRequirement",
                table: "Pets");

            migrationBuilder.DropColumn(
                name: "IdealHome",
                table: "Pets");

            migrationBuilder.DropColumn(
                name: "IntakeDate",
                table: "Pets");

            migrationBuilder.DropColumn(
                name: "IntakeReason",
                table: "Pets");

            migrationBuilder.DropColumn(
                name: "IsChipped",
                table: "Pets");

            migrationBuilder.DropColumn(
                name: "IsHouseTrained",
                table: "Pets");

            migrationBuilder.DropColumn(
                name: "IsNeutered",
                table: "Pets");

            migrationBuilder.DropColumn(
                name: "MedicalNotes",
                table: "Pets");

            migrationBuilder.DropColumn(
                name: "Size",
                table: "Pets");

            migrationBuilder.DropColumn(
                name: "SpecialNeeds",
                table: "Pets");

            migrationBuilder.DropColumn(
                name: "Weight",
                table: "Pets");
        }
    }
}
