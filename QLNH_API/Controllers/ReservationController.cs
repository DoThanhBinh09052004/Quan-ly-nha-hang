using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QLNH_API.DTO.Reservation;
using QLNH_API.Model;
using QLNH_API.Services;

namespace QLNH_API.Controllers
{
    [ApiController]
    [Route("[controller]")]
    [Authorize(Roles = "Manager, Cashier")]
    public class ReservationController : ControllerBase
    {
        private readonly ReservationService _service;

        public ReservationController(ReservationService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ReservationDTO>>> Get(
            [FromQuery] DateTime? date,
            [FromQuery] int? tableId)
        {
            return Ok(await _service.GetAsync(date, tableId));
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<ReservationDTO>> GetById(int id)
        {
            var reservation = await _service.GetByIdAsync(id);
            return reservation == null ? NotFound() : Ok(reservation);
        }

        [HttpPost]
        public async Task<ActionResult<ReservationDTO>> Create(CreateReservationDTO dto)
        {
            try
            {
                var reservation = await _service.CreateAsync(dto);
                return CreatedAtAction(nameof(GetById), new { id = reservation.Id }, reservation);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id:int}")]
        public async Task<ActionResult<ReservationDTO>> Update(int id, UpdateReservationDTO dto)
        {
            try
            {
                var reservation = await _service.UpdateAsync(id, dto);
                return reservation == null ? NotFound() : Ok(reservation);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id:int}/status")]
        public async Task<ActionResult<ReservationDTO>> ChangeStatus(int id, ChangeReservationStatusDTO dto)
        {
            try
            {
                var reservation = await _service.ChangeStatusAsync(id, dto.Status);
                return reservation == null ? NotFound() : Ok(reservation);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id:int}/confirm")]
        public Task<ActionResult<ReservationDTO>> Confirm(int id) => ChangeStatus(id,
            new ChangeReservationStatusDTO { Status = ReservationStatuses.Confirmed });

        [HttpPut("{id:int}/arrive")]
        public Task<ActionResult<ReservationDTO>> Arrive(int id) => ChangeStatus(id,
            new ChangeReservationStatusDTO { Status = ReservationStatuses.Arrived });

        [HttpPut("{id:int}/complete")]
        public Task<ActionResult<ReservationDTO>> Complete(int id) => ChangeStatus(id,
            new ChangeReservationStatusDTO { Status = ReservationStatuses.Completed });

        [HttpPut("{id:int}/cancel")]
        public Task<ActionResult<ReservationDTO>> Cancel(int id) => ChangeStatus(id,
            new ChangeReservationStatusDTO { Status = ReservationStatuses.Cancelled });

        [HttpPut("{id:int}/no-show")]
        public Task<ActionResult<ReservationDTO>> NoShow(int id) => ChangeStatus(id,
            new ChangeReservationStatusDTO { Status = ReservationStatuses.NoShow });
    }
}
