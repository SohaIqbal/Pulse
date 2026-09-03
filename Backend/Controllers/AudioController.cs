using System;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Supabase;
using Audio.Models;
using Amazon.S3;
using Amazon.S3.Model;
using AudioClass = Backend.Models.Audio;
using Backend.Models;
using Hangfire;
using System.Text.Json;
using Backend.Models.Workers;
namespace Backend.Controllers

{
    [ApiController]
    [Route("api/[controller]")]
    public class AudioController: ControllerBase
    {
        private readonly Client _supabaseClient;
        private readonly IAmazonS3 _s3Client;
        private readonly IConfiguration _configuration;

        private readonly IBackgroundJobClient _backgroundJobs;

      

        public AudioController(Client supabaseClient, IAmazonS3 s3Client, IConfiguration configuration, IBackgroundJobClient backgroundJobs)
        {
            _supabaseClient = supabaseClient;
            _s3Client = s3Client;
            _configuration = configuration;
            _backgroundJobs = backgroundJobs;
        }

        

        [HttpPost("generate-presigned-url")]
        public IActionResult GenerateUrl([FromBody] UrlDto urldto)
        {
            if (urldto == null)
            {
                return BadRequest("No data provided.");
            }

            var bucketName = _configuration["BackblazeB2:BucketName"];
            if (string.IsNullOrWhiteSpace(bucketName))
            {
                return StatusCode(500, "Backblaze bucket name is not configured.");
            }

            string uniqueId = Guid.NewGuid().ToString();
            string fileKey = $"audio/{uniqueId}/{urldto.Filename}";

            
                var presignRequest = new GetPreSignedUrlRequest
                {
                    BucketName = bucketName,
                    Key = fileKey,
                    Verb = HttpVerb.PUT,
                    Expires = DateTime.UtcNow.AddMinutes(15),
                    ContentType = urldto.File_Type
                };

                var presignedUrl = _s3Client.GetPreSignedURL(presignRequest);


                if (string.IsNullOrEmpty(presignedUrl))
                {
                    return StatusCode(500, "Failed to generate presigned URL.");
                }


                return Ok(new
                {
                    message = "Link created successfully.",
                    presignedurl = presignedUrl,
                    filekey = fileKey
                });
            }
           
        

        [HttpPost("save-to-db")]
        public async Task<IActionResult> UploadAudio([FromBody] AudioCreateDto audioDto)
        {
            if(audioDto == null)
            {
                return BadRequest("Theres no data for this file.");
            }
            var newAudio = new AudioClass
            {
                Filename = audioDto.Filename,
                File_Type = audioDto.File_Type,
                File_Size = audioDto.File_Size,
                Duration = audioDto.Duration,
                File_Key = audioDto.File_Key,
                Status = audioDto.Status // Assuming you have a Status property in AudioCreateDto
            };

            var response = await _supabaseClient.From<AudioClass>().Insert(newAudio);

            if (response == null)
            {
                return StatusCode(500, "Failed to insert audio record.");
            }
            return Ok(new
            {
                message = "Audio record saved successfully.",
                data = response
            });

            



        }
        


        [HttpPost("start-processing/{id}")]



        public async Task<IActionResult> StartProcessing([FromRoute] string id)
        {

            if(!Guid.TryParse(id, out Guid validguid))
            {
                return BadRequest("The provided ID is not a valid UUID.");
            }


          
        if (string.IsNullOrWhiteSpace(id))
            {
                return BadRequest("Audio ID not received.");
            }
          
            var response = await _supabaseClient.From<AudioClass>().Where(a => a.Id == validguid).Get();
            var audioRecord = response.Models.FirstOrDefault();
            
            if(audioRecord == null)
            {
                return NotFound("Audio record not found.");
            }

           
           
            var done = _backgroundJobs.Enqueue<AudioProcessingWorker>(worker => worker.ProcessAudioPipeline(validguid.ToString(), audioRecord.File_Key!));

            if(done == null)
            {
                return StatusCode(500, "Failed to enqueue audio processing job.");
            }
            return Ok(new {message ="Pipeline Started"});
            
          
            


        }



        [HttpPost("change-language")]
        

            public async Task<IActionResult> ChangeLanguage([FromBody] LanguageChangeDto languageChangeDto)
            {

                if(languageChangeDto == null|| string.IsNullOrWhiteSpace(languageChangeDto.AudioId) || 
                   string.IsNullOrWhiteSpace(languageChangeDto.CurrLanguage) || 
                   string.IsNullOrWhiteSpace(languageChangeDto.DesLanguage))
                {
                    return BadRequest("No data provided.");
                }


                Guid parsed = Guid.Parse(languageChangeDto.AudioId);


                var response = await _supabaseClient.From<AudioClass>().Where(a => a.Id == parsed).Get();
                var audioRecord = response.Models.FirstOrDefault();
                string raw = audioRecord.Summaries ?? string.Empty;
                if(string.IsNullOrWhiteSpace(raw))
                {
                    return BadRequest("No summaries found for this audio record.");
                }






            try
            {
                
                 using var doc = JsonDocument.Parse(raw);
        var root = doc.RootElement;

         bool hasExecutiveSummary = root.TryGetProperty("executiveSummary", out var execEl);
        bool hasActionItems = root.TryGetProperty("actionItems", out var actionEl) && actionEl.ValueKind == JsonValueKind.Array && actionEl.GetArrayLength() > 0;
        bool hasWhatsappReplies = root.TryGetProperty("whatsappReplies", out var repliesEl) && repliesEl.ValueKind == JsonValueKind.Array && repliesEl.GetArrayLength() > 0;




          var promptBuilder = new System.Text.StringBuilder();
        promptBuilder.AppendLine($"You are an expert translator. Translate the value strings inside this JSON object from {languageChangeDto.CurrLanguage.ToUpper()} into {languageChangeDto.DesLanguage.ToUpper()}.");
        promptBuilder.AppendLine("CRITICAL RULES:");
        promptBuilder.AppendLine("1. Translate ONLY the text values. Do NOT change the JSON keys.");
        promptBuilder.AppendLine("2. Return ONLY the raw translated JSON object. No markdown code blocks (```json).");
        promptBuilder.AppendLine("\nHere is the JSON object containing ONLY the available fields to translate:\n{");



        var jsonFields = new List<string>();
        if (hasExecutiveSummary) jsonFields.Add($"  \"executiveSummary\": {execEl.GetRawText()}");
        if (hasActionItems) jsonFields.Add($"  \"actionItems\": {actionEl.GetRawText()}");
        if (hasWhatsappReplies) jsonFields.Add($"  \"whatsappReplies\": {repliesEl.GetRawText()}");

        promptBuilder.AppendLine(string.Join(",\n", jsonFields));
        promptBuilder.AppendLine("}");

        string baseInstructions = $"You are a strict translation utility. Translate the value strings inside this JSON object from {languageChangeDto.CurrLanguage} to {languageChangeDto.DesLanguage}.\n\n" +
                          $"CRITICAL RULES:\n" +
                          $"1. Translate ONLY the string text values inside the quotes. Do not add or change any facts.\n" +
                          $"2. Do NOT change or translate the JSON keys.\n" +
                          $"3. IF AN ARRAY IS EMPTY [], LEAVE IT EXACTLY AS AN EMPTY ARRAY [].\n\n" +
                          $"Here is the JSON object to translate:\n{{\n";

// 3. Combine everything together into the final variable you send to Gemini!
string geminiPrompt = baseInstructions + string.Join(",\n", jsonFields) + "\n}";
        using var geminireq = new HttpClient();
var requestPayload = new
{
    contents = new[] {
        new { parts = new[] { new { text = geminiPrompt } } }
    },
    generationConfig = new
{
    responseMimeType = "application/json",
    responseSchema = new
    {
        type = "OBJECT",
        properties = new
        {
            executiveSummary = new { type = "STRING" },
            actionItems = new { type = "ARRAY", items = new { type = "STRING" } },
            whatsappReplies = new { type = "ARRAY", items = new { type = "STRING" } }
        },
        required = new[] { "executiveSummary", "actionItems", "whatsappReplies" }
    },
    temperature = 0.2
}// Forces structured JSON returns
};

string geminiApiKey = _configuration["Gemini:ApiKey"] ?? throw new ArgumentNullException(nameof(_configuration), "Gemini API Key is missing.");
string model = "gemini-3.1-flash-lite";
string geminiUrl = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={geminiApiKey}";


var jsonContent = new StringContent(System.Text.Json.JsonSerializer.Serialize(requestPayload), System.Text.Encoding.UTF8, "application/json");
var geminiResponse = await geminireq.PostAsync(geminiUrl, jsonContent);



              if (!geminiResponse.IsSuccessStatusCode)
{
    var errorContent = await geminiResponse.Content.ReadAsStringAsync();
    return StatusCode((int)geminiResponse.StatusCode, $"Gemini API call failed: {errorContent}");
}

try
{
    var geminiResponseContent = await geminiResponse.Content.ReadAsStringAsync();
    using var geminiResponseJson = JsonDocument.Parse(geminiResponseContent);
    var root1 = geminiResponseJson.RootElement;

    // FIX 1: Safely navigate Gemini's real envelope structure (candidates -> content -> parts)
    if (root1.TryGetProperty("candidates", out var candidates) && 
        candidates.ValueKind == JsonValueKind.Array && candidates.GetArrayLength() > 0)
    {
        var firstCandidate = candidates[0];
        
        if (firstCandidate.TryGetProperty("content", out var content) &&
            content.TryGetProperty("parts", out var parts) && 
            parts.ValueKind == JsonValueKind.Array && parts.GetArrayLength() > 0)
        {
            // Extract the clean JSON string from Gemini's parts element array block
            string translatedJsonString = parts[0].GetProperty("text").GetString() ?? string.Empty;

            if (string.IsNullOrWhiteSpace(translatedJsonString))
            {
                return StatusCode(500, "Gemini returned an empty text payload.");
            }

            var options1 = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var verifiedObject = JsonSerializer.Deserialize<SummaryPayload>(translatedJsonString, options1);

            // Structure validation guard clause check
            if (verifiedObject == null || string.IsNullOrWhiteSpace(verifiedObject.ExecutiveSummary))
            {
                return StatusCode(500, "Gemini returned an invalid JSON structure layout.");
            }

            // FIX 3: Correct Supabase model extraction and update execution syntax
            var res3 = await _supabaseClient.From<AudioClass>().Where(x => x.Id == parsed).Get();
            var record3 = res3.Model; // Changed from .Model
            
            if (record3 != null)
            {
                record3.Summaries = translatedJsonString;
                
                // Commit updates over the exact same column space row model
                await _supabaseClient.From<AudioClass>().Update(record3); 

                // Return the clean data structure directly to React
                return Ok(new
                {
                    success = true, // Matches frontend validation hooks
                    data = verifiedObject
                });
            }
            else
            {
                return NotFound("Audio record could not be verified during save loop execution.");
            }
        }
    }

    return StatusCode(500, "Failed to navigate the Gemini candidate response elements block.");
}
catch (JsonException jsonEx)
{
    return StatusCode(500, $"Failed to parse summaries JSON: {jsonEx.Message}");
}
catch (Exception ex)
{
    return StatusCode(500, $"An error occurred during translation pipeline routing: {ex.Message}");
}

            }
            catch (Exception ex)
            {
                return StatusCode(500, $"An error occurred: {ex.Message}");
            }
       

        }

        public class SummaryPayload
{
    public string ExecutiveSummary { get; set; } = string.Empty;
    public List<string> ActionItems { get; set; } = new();
    public List<string> WhatsappReplies { get; set; } = new();
}

        
}}