using System.ComponentModel.DataAnnotations;

namespace Audio.Models
{
    public class UrlDto
    {
        [Required(ErrorMessage = "File Name is required.")]
        public string? Filename { get; set; }

        [Required(ErrorMessage = "File type is required.")]

        [RegularExpression(@"^audio\/[a-zA-Z0-9.-]+$", ErrorMessage = "Invalid audio mime type (e.g., audio/mp3, audio/wav).")]
        public string? File_Type { get; set; }
    }
}