using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using QLNH_API.Data;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace QLNH_API.Services
{
    public class AuthService
    {
        private readonly IConfiguration _config;
        private readonly ApplicationDbcontext _context;

        public AuthService(IConfiguration config, ApplicationDbcontext context)
        {
            _config = config;
            _context = context;
        }

        public string? Login(string username, string password)
        {
            var user = _context.User
                .Include(u => u.role)
                .FirstOrDefault(u => u.Username == username && u.Password == password && !u.Deleted);

            if (user == null) return null;

            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(_config["Jwt:Key"]);

            var claims = new[]
            {
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Role, user.role.Name),
                new Claim("role", user.role.Name)
            };

            var creds = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature);

            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.Now.AddHours(4),
                signingCredentials: creds
            );

            return tokenHandler.WriteToken(token);
        }
    }
}
