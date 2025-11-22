using Microsoft.AspNetCore.Mvc;
using QLNH_API.Data;
using QLNH_API.Model;

namespace QLNH_API.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class UnitTypeController : ControllerBase
    {
        private readonly ApplicationDbcontext _context;
        public UnitTypeController(ApplicationDbcontext context)
        {
            _context = context;
        }

        //[HttpGet]
        //public IEnumerable<UnitType> GetUnitTypes()
        //{
        //    return _context.UnitType.ToList();
        //}
    }
}