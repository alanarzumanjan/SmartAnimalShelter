using Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Models;
using MongoDB.Bson;
using MongoDB.Driver;
using MongoDB.Driver.GridFS;

namespace Controllers
{
    [ApiController]
    [Route("pets")]
    public class ImageController : ControllerBase
    {
        private readonly GridFSBucket _bucket;
        private readonly AppDbContext _db;

        public ImageController(IMongoDatabase mongoDatabase, AppDbContext db)
        {
            _bucket = new GridFSBucket(mongoDatabase);
            _db = db;
        }

        [HttpPost("{id}/image")]
        [Authorize]
        [RequestSizeLimit(50_000_000)] // 50MB
        [RequestFormLimits(MultipartBodyLengthLimit = 50_000_000)]
        public async Task<IActionResult> UploadImage(Guid id, IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded.");

            // Find pet
            var pet = await _db.Pets.FirstOrDefaultAsync(p => p.Id == id);
            if (pet == null)
                return NotFound("Pet not found.");

            // Check if user owns the shelter for this pet
            var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(userIdString, out var userId))
                return Unauthorized();

            var shelter = await _db.Shelters.FirstOrDefaultAsync(s => s.Id == pet.ShelterId);
            if (shelter == null || shelter.OwnerId != userId)
                return Forbid("You do not own this shelter.");

            try
            {
                // Upload to GridFS
                using var stream = file.OpenReadStream();
                var options = new GridFSUploadOptions
                {
                    Metadata = new BsonDocument
                    {
                        { "contentType", file.ContentType },
                        { "petId", id.ToString() },
                        { "fileName", file.FileName }
                    }
                };
                var fileId = await _bucket.UploadFromStreamAsync(id.ToString(), stream, options);

                // Update pet's image reference
                pet.MongoImageId = fileId.ToString();
                pet.ImageUrl = $"/pets/{id}/image";
                await _db.SaveChangesAsync();

                return Ok(new { mongoImageId = fileId.ToString(), message = "Image uploaded to MongoDB" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ MongoDB image upload error: {ex.Message}");
                return StatusCode(500, $"MongoDB error: {ex.Message}");
            }
        }

        [HttpGet("{id}/image")]
        public async Task<IActionResult> GetPetImage(Guid id)
        {
            var pet = await _db.Pets.FirstOrDefaultAsync(p => p.Id == id);
            if (pet == null || string.IsNullOrWhiteSpace(pet.MongoImageId))
                return NotFound("Image not found.");

            try
            {
                var objectId = ObjectId.Parse(pet.MongoImageId);
                var stream = await _bucket.OpenDownloadStreamAsync(objectId);
                return File(stream, stream.FileInfo.Metadata?["contentType"]?.AsString ?? "image/jpeg");
            }
            catch (GridFSFileNotFoundException)
            {
                return NotFound("Image not found in MongoDB.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ MongoDB image download error: {ex.Message}");
                return StatusCode(500, $"MongoDB error: {ex.Message}");
            }
        }
    }
}
