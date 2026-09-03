using System.ComponentModel.DataAnnotations;
using Newtonsoft.Json;
namespace Backend.Models;

public class LanguageChangeDto
{


    [JsonProperty("audioId")]
    [Required(ErrorMessage = "Audio ID is required.")]
    public string? AudioId { get; set; }


    [JsonProperty("currentlang")]
    [Required(ErrorMessage = "currentLanguage is required.")]
    [StringLength(100, ErrorMessage = "Language cannot exceed 100 characters.")]
    public string? CurrLanguage { get; set; }


    [JsonProperty("targetlang")]
    [Required(ErrorMessage = "currentLanguage is required.")]
    [StringLength(100, ErrorMessage = "Language cannot exceed 100 characters.")]
    public string? DesLanguage { get; set; }



}

