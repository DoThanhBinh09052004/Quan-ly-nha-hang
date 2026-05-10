using System.ComponentModel.DataAnnotations;

namespace QLNH_API.DTO
{
    public class ChangeMyPasswordDTO
    {
        public string Username { get; set; } = string.Empty;
        public string OldPassword { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }
}

