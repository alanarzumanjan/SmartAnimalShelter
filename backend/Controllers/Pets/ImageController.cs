using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver.GridFS;
using MongoDB.Driver;
using MongoDB.Bson;
using Microsoft.EntityFrameworkCore;
using Data;
using Models;

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

            // Upload to GridFS
            using var stream = file.OpenReadStream();
            var options = new GridFSUploadOptions
            {
                Metadata = new BsonDocument { { "contentType", file.ContentType }, { "petId", id.ToString() } }
            };
            var fileId = await _bucket.UploadFromStreamAsync(Guid.NewGuid().ToString(), stream, options);

            // Update pet's image reference
            pet.MongoImageId = fileId.ToString();
            await _db.SaveChangesAsync();

            return Ok(new { mongoImageId = fileId.ToString(), message = "Image uploaded" });
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
            catch
            {
                return NotFound("Image not found.");
            }
        }
    }
}
