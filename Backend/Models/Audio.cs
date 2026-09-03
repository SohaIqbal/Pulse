using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace Backend.Models;

[Table("audio")]

public class Audio : BaseModel
{
    [PrimaryKey("id")]
    public Guid? Id { get; set; }

    [Column("file_name")]
    public string? Filename { get; set; }

    [Column("file_type")]
    public string? File_Type { get; set; }

    [Column("file_size")]
    public int? File_Size { get; set; }

    [Column("duration")]
    public int Duration { get; set; }

    [Column("status")]
    public string? Status { get; set; }

    [Column("file_key")]
    public string? File_Key { get; set; }

    [Column("detected_lang")]
    public string? Detected_Lang { get; set; }


    [Column("summaries")]
    public string? Summaries { get; set; }
}