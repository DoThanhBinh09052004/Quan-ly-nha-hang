using Microsoft.AspNetCore.Http;

namespace QLNH_API.DTO
{
    public class CreateItemImageDTO
    {
        public string Name { get; set; }
        public string? Description { get; set; }
        public IFormFile File { get; set; }   // File upload
    }
}
