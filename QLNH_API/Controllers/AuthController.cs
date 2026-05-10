using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QLNH_API.Data;
using QLNH_API.DTO;
using QLNH_API.Services;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;
    private readonly ApplicationDbcontext _context;

    public AuthController(AuthService authService, ApplicationDbcontext context)
    {
        _authService = authService;
        _context = context;
    }

    [HttpPost("login")]
    public IActionResult Login([FromBody] LoginRequest request)
    {
        var token = _authService.Login(request.Username, request.Password);
        if (token == null)
            return Unauthorized(new { message = "Sai tài khoản hoặc mật khẩu" });

        return Ok(new { token });
    }

    [HttpPut("change-my-password")]
    public async Task<IActionResult> ChangeMyPassword([FromBody] ChangeMyPasswordDTO dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Username))
            return BadRequest(new { message = "Vui lòng cung cấp tên tài khoản" });

        var user = await _context.User.FirstOrDefaultAsync(u => u.Username == dto.Username && !u.Deleted);

        if (user == null)
            return BadRequest(new { message = "Tài khoản không tồn tại" });

        if (user.Password != dto.OldPassword)
            return BadRequest(new { message = "Mật khẩu cũ không đúng" });

        user.Password = dto.NewPassword;
        user.Updated = DateTime.Now;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Đổi mật khẩu thành công! Bạn có thể đăng nhập lại." });
    }
    public class LoginRequest
    {
        public string Username { get; set; }
        public string Password { get; set; }
    }
}
