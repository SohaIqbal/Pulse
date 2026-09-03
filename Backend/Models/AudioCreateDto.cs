using System.ComponentModel.DataAnnotations;
using Newtonsoft.Json;
namespace Backend.Models
{
    public class AudioCreateDto

    {
        [JsonProperty("filename")]
        [Required(ErrorMessage = "Filename is required.")]
        [StringLength(255, ErrorMessage = "Filename cannot exceed 255 characters.")]
        public string? Filename { get; set; }

        [JsonProperty("filetype")]
        [Required(ErrorMessage = "File type is required.")]

        [RegularExpression(@"^audio\/[a-zA-Z0-9.-]+$", ErrorMessage = "Invalid audio mime type (e.g., audio/mp3, audio/wav).")]
        public string? File_Type { get; set; }

        // Accept snake_case payloads as well.
        [JsonProperty("file_type")]
        public string File_Type_Snake
        {
            set => File_Type = value;
        }


        [JsonProperty("filesize")]

        [Required]

        [Range(1, 524288000, ErrorMessage = "File size must be between 1 Byte ro 500 MB.")]
        public int File_Size { get; set; }

        [JsonProperty("file_size")]
        public int File_Size_Snake
        {
            set => File_Size = value;
        }


        [JsonProperty("duration")]

        [Required]
        [Range(1, 36000, ErrorMessage = "Duration must be between 1 second and 10 hours.")]
        public int Duration { get; set; }


        [JsonProperty("status")]

        [Required(ErrorMessage = "Status is required.")]
        [RegularExpression(@"^(PENDING|TRANSCODING|TRANSCRIBING|TRANSLATING|COMPLETED)$", ErrorMessage = "Status must be one of the following: PENDING, TRANSCODING, TRANSCRIBING, TRANSLATING, COMPLETED.")]
        public string? Status { get; set; }


        [JsonProperty("filekey")]

        [Required(ErrorMessage = "File key is required.")]
        public string? File_Key { get; set; }

        [JsonProperty("file_key")]
        public string File_Key_Snake
        {
            set => File_Key = value;
        }

        // [Required]
        // public int Status { get; set; }

        [JsonProperty("detected_lang")]
        public string? Detected_Lang { get; set; }

        [JsonProperty("summaries")]
        public string? Summaries { get; set; }
    }
}