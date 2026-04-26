using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartShelter.API.Migrations
{
    /// <inheritdoc />
    public partial class RemoveShelterOwnerId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ShelterOwnerId",
                table: "Shelters");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ShelterOwnerId",
                table: "Shelters",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));
        }
    }
}
