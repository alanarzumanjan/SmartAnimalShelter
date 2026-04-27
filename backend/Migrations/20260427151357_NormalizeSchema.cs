using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartShelter.API.Migrations
{
    /// <inheritdoc />
    public partial class NormalizeSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"DROP INDEX IF EXISTS ""IX_Measurements_EnclosureId_Timestamp""");

            migrationBuilder.Sql(@"DROP INDEX IF EXISTS ""IX_Measurements_ShelterId_Timestamp""");

            migrationBuilder.Sql(@"ALTER TABLE ""Pets"" DROP COLUMN IF EXISTS ""Price""");

            migrationBuilder.Sql(@"ALTER TABLE ""Measurements"" DROP COLUMN IF EXISTS ""EnclosureId""");

            migrationBuilder.Sql(@"ALTER TABLE ""Measurements"" DROP COLUMN IF EXISTS ""ShelterId""");

            migrationBuilder.Sql(@"UPDATE ""Users"" SET ""Role"" = 'shelter' WHERE ""Role"" = 'shelter_owner'");

            migrationBuilder.Sql(@"UPDATE ""Users"" SET ""Role"" = 'shelter' WHERE ""Role"" = 'veterinarian'");

            migrationBuilder.AlterColumn<string>(
                name: "Role",
                table: "Users",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50);

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "Orders",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50);

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "AdoptionRequests",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Role",
                table: "Users",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AddColumn<string>(
                name: "Price",
                table: "Pets",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "Orders",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AddColumn<Guid>(
                name: "EnclosureId",
                table: "Measurements",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ShelterId",
                table: "Measurements",
                type: "uuid",
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "AdoptionRequests",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.CreateIndex(
                name: "IX_Measurements_EnclosureId_Timestamp",
                table: "Measurements",
                columns: new[] { "EnclosureId", "Timestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_Measurements_ShelterId_Timestamp",
                table: "Measurements",
                columns: new[] { "ShelterId", "Timestamp" });
        }
    }
}
