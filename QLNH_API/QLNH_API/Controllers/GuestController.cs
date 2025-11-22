using Microsoft.AspNetCore.Mvc;
using QLNH_API.Data;
using QLNH_API.Model;

namespace QLNH_API.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class GuestController : ControllerBase
    {
        private readonly ApplicationDbcontext _context;
        public GuestController(ApplicationDbcontext context)
        {
            _context = context;
        }

        [HttpGet]
        public IEnumerable<Guest> GetGuests()
        {
            return _context.Guest.ToList();
        }
    }
}