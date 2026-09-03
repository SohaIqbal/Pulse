using System.Diagnostics;
using System.Net.Http.Headers;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Amazon.S3;
using Amazon.S3.Model;
using Supabase;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using System.Net.Http;
using Hangfire;
using Microsoft.AspNetCore.SignalR;


using AudioClass = Backend.Models.Audio;

namespace Backend.Models.Workers;
public class AudioProcessingWorker
{


    private readonly Client _supabaseClient;
    private readonly IConfiguration _config;
    private readonly IHttpClientFactory  _httpClient;

    private readonly ILogger<AudioProcessingWorker> _logger;
    private readonly IAmazonS3 _s3Client;

    private readonly HttpClient Client;

    private readonly IHubContext<PipelineHub> _hubContext;


    public AudioProcessingWorker(Client supabaseClient, IConfiguration config, IHttpClientFactory httpClient, ILogger<AudioProcessingWorker> logger, IAmazonS3 s3Client, HttpClient client, IHubContext<PipelineHub> hubContext)
    {
        _supabaseClient = supabaseClient;
        _config = config;
        _httpClient = httpClient;
        _logger = logger;
        _s3Client = s3Client;
        Client = client;
        _hubContext = hubContext;
    }


    



    [AutomaticRetry(Attempts = 5, LogEvents = true, OnAttemptsExceeded = AttemptsExceededAction.Fail)]
    public async Task ProcessAudioPipeline(string id, string filekey)
    {
         string tempInputFile = Path.Combine(Path.GetTempPath(), $"{Guid.NewGuid()}_input.m4a");
        string tempOutputFile = Path.Combine(Path.GetTempPath(), $"{Guid.NewGuid()}_16k_mono.wav");


        try
        {
            Guid parsed = Guid.Parse(id);
            

            //step 1 : Download the audio file from Backblaze B2

              var res1 = await _supabaseClient.From<AudioClass>().Where(x=>x.Id==parsed).Get();
       var record1 = res1.Model;
        if(record1 != null)
            {
                
                record1.Status = "Transcoding";


                await record1.Update<AudioClass>();
            }


            await _hubContext.Clients.All.SendAsync("ReceiveStatus", parsed, "Transcoding");


      
            _logger.LogInformation($"[Worker Step 1]: Fetching {filekey} from Backblaze B2 and saving in tempinputfile...");


            string keyId ="005866c31d407550000000004";
            string appKey = "K005IIkGi3YChX4WBlidLsIfcXZU7fA";
            string endpoint = "https://s3.us-east-005.backblazeb2.com";
            string bucketName = "Pulseit";



            var s3Config = new AmazonS3Config { ServiceURL = endpoint };
           using var s3Client = new AmazonS3Client(keyId, appKey, s3Config);

           var getobject = new GetObjectRequest
            {
                BucketName = bucketName,
                Key = filekey
            };


            using (var s3Response = await s3Client.GetObjectAsync(getobject))
{
    await s3Response.WriteResponseStreamToFileAsync(tempInputFile, false, CancellationToken.None);
}



//  convert and normalize an incoming audio file into a perfect format for AI speech-to-text engines
_logger.LogInformation("[Worker Step 2]: Running FFmpeg configuration profile normalization...");




var processInfo = new ProcessStartInfo
{
    FileName = "ffmpeg",
    Arguments = $"-i \"{tempInputFile}\" -vn -acodec pcm_s16le -ac 1 -ar 16000 \"{tempOutputFile}\" -y",
    RedirectStandardError = true,
    UseShellExecute = false,
    CreateNoWindow = true
};

using (var process = new Process { StartInfo = processInfo })
{
    process.Start(); // 1. Launches FFmpeg in the background
    string ffmpegErrors = await process.StandardError.ReadToEndAsync(); // 2. Captures logs
    await process.WaitForExitAsync(); // 3. Pauses C# until FFmpeg finishes writing the file
     if(process.ExitCode != 0) throw new Exception($"FFmpeg failed with exit code {process.ExitCode}. Errors: {ffmpegErrors}");



          
        }


        _logger.LogInformation($"Transcoding done  ! Temp input file: {tempInputFile}, Temp output file: {tempOutputFile}");


         var res2 = await _supabaseClient.From<AudioClass>().Where(x=>x.Id==parsed).Get();
       var record2 = res2.Model;
        if(record2 != null)
            {
                
                record2.Status = "Transcribing";


                await record2.Update<AudioClass>();
            }



        await _hubContext.Clients.All.SendAsync("ReceiveStatus", parsed, "Transcribing");


        _logger.LogInformation($"[Worker Step 3]: Now onto Transcribing");


       
      

        _logger.LogInformation(" Sending .wav file to WhisperAPI...");



        string apiKey = _config["Groq:ApiKey"]?? throw new ArgumentNullException(nameof(_config), "Groq API Key is missing.");

       


      
        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

        _logger.LogInformation(" Found the key...");


        using var form = new MultipartFormDataContent();

        string extension = Path.GetExtension(filekey)?.ToLower() ?? ".mp3";

        string mimeType = extension switch
        {
             ".mp3" => "audio/mpeg",
    ".wav" => "audio/wav",
    ".m4a" => "audio/mp4",
    ".ogg" => "audio/ogg",
    ".webm" => "audio/webm",
    _ => "application/octet-stream" // Fallback default
        };

         var fileBytes = await System.IO.File.ReadAllBytesAsync(tempOutputFile);
    var fileContent = new ByteArrayContent(fileBytes);
    fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(mimeType);


    _logger.LogInformation(" Files ready...");


    form.Add(fileContent, "file", $"audio{extension}"); // The third parameter is the filename sent to the API

var formatContent = new StringContent("verbose_json");
formatContent.Headers.ContentType = null; // 👈 CRITICAL FIX: Stops Groq from ignoring this field!

_logger.LogInformation($" verbose...{formatContent.ReadAsStringAsync().Result}");
form.Add(formatContent, "response_format");
    var modelContent = new StringContent("whisper-large-v3-turbo");
    
modelContent.Headers.ContentType = null; // Strips sub-headers that confuse Groq
form.Add(modelContent, "model");




   _logger.LogInformation("Sending transcription request to Groq...");
    var response = await Client.PostAsync("https://api.groq.com/openai/v1/audio/transcriptions", form);

            if (!response.IsSuccessStatusCode)
            {
                var errPayload = await response.Content.ReadAsStringAsync();
                _logger.LogError($"GROQ API request failed with status code: {errPayload}");
                throw new Exception($"API request failed with status code: {response.StatusCode}");
            }

            string raw = await response.Content.ReadAsStringAsync();

            _logger.LogInformation($" Verbose content {raw}");

        _logger.LogInformation(" Parsing...");


        var result = await response.Content.ReadAsStringAsync();
        using var doc = System.Text.Json.JsonDocument.Parse(result);

        var root = doc.RootElement;

        // string transcriptText = root.GetProperty("text").GetString() ?? "";
         string transcriptText = string.Empty;
        if(root.TryGetProperty("text", out var textElement))
        {
             transcriptText = textElement.GetString() ?? "";
            _logger.LogInformation($" Transcript: {transcriptText}");
        }
        else
        {
            _logger.LogWarning("No 'text' property found in the Whisper API response.");
        }
        


        string detectedlang = "en"; // Default to English if not detected


        if(root.TryGetProperty("language", out var langElement))
        {
            string rawValue = langElement.GetRawText().Replace("\"", "").Trim().ToLower();

    if (!string.IsNullOrWhiteSpace(rawValue))
    {
        detectedlang = rawValue;
    }





            
        };
        _logger.LogInformation($"Processed Language Code: {detectedlang}");
       

     


         _logger.LogInformation($"Transcription completed. Detected language: {detectedlang}, Transcript: {transcriptText}");


            var res3 = await _supabaseClient.From<AudioClass>().Where(x=>x.Id==parsed).Get();
       var record3 = res3.Model;
        if(record3 != null)
            {
                
                record3.Status = "Extracting";
                record3.Detected_Lang = detectedlang;


                await record3.Update<AudioClass>();
            }



         await _hubContext.Clients.All.SendAsync("ReceiveStatus", parsed, "Extracting");

         _logger.LogInformation($"[Worker Step 4]: Now onto Translating & Extracting insights...");


         var targetlang = "english";
        string geminiPrompt = $@"
Analyze the following transcribed audio text. Provide a response formatted strictly as a single JSON object. Do not wrap it in markdown blocks or add any properties outside the schema.

Text to analyze: ""{transcriptText}""
Target Translation Language: {targetlang}

IMPORTANT RULES:
- Only include information explicitly stated in the text. Do not infer, assume, or invent context, intent, or follow-up actions that are not directly supported by what was said.
- If the message is a greeting, a test message, a voicemail with no business content, or otherwise lacks substantive/actionable content, set executiveSummary to a plain, honest description of what the message actually is (e.g. ""This is a short test message with no actionable content""), and return empty arrays for actionItems and whatsappReplies. Do not fabricate action items or replies to fill the format.
- Action items must only describe things the LISTENER needs to do in direct response to something explicitly requested, asked, or implied by the speaker. Never generate action items for routine greetings, acknowledgments, or test messages.
- whatsappReplies must only be included if a reply would make sense given what was actually said. Do not invent replies that imply something happened (e.g. an application being received/reviewed) unless the text explicitly says so.
- All text in the output (executiveSummary, actionItems, whatsappReplies) must be written in the Target Translation Language specified above.
- Preserve EXACT alphanumeric IDs (e.g., PO numbers, PR numbers) and financial totals without rounding or guessing.
When deciding whether to populate actionItems or whatsappReplies, ask: Would 
a real listener reasonably need to act on this, or reply to this, based ONLY 
on what was explicitly said? If genuinely unsure, prefer leaving the array 
empty over guessing. Always include all three keys in the output — 
executiveSummary as a string, actionItems and whatsappReplies as arrays 
(which may be empty), never omit a key.
The output must exactly follow this structural JSON schema layout:
{{
  ""executiveSummary"": ""A clean, high-level summary paragraph written in the target language, or a plain description if the content is trivial/non-substantive"",
  ""actionItems"": [
    ""First clear, explicitly-supported action item"",
    ""Second clear, explicitly-supported action item""
  ],
  ""whatsappReplies"": [
    ""Short 1-tap quick reply text option"",
    ""Alternative quick reply text choice""
  ]

  
}}";

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

string geminiApiKey = _config["Gemini:ApiKey"] ?? throw new ArgumentNullException(nameof(_config), "Gemini API Key is missing.");
string model = "gemini-3.1-flash-lite";
string geminiUrl = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={geminiApiKey}";


var jsonContent = new StringContent(System.Text.Json.JsonSerializer.Serialize(requestPayload), System.Text.Encoding.UTF8, "application/json");
var geminiResponse = await geminireq.PostAsync(geminiUrl, jsonContent);

            if (!geminiResponse.IsSuccessStatusCode)
            {
                var errBody = await geminiResponse.Content.ReadAsStringAsync();
                _logger.LogError($"Gemini API request failed with {errBody}, status code: {geminiResponse.StatusCode}");
                
                
            }
 string geminiResult = await geminiResponse.Content.ReadAsStringAsync();
using var geminiJson = System.Text.Json.JsonDocument.Parse(geminiResult);
string structuredResultJson = geminiJson.RootElement
    .GetProperty("candidates")[0]
    .GetProperty("content")
    .GetProperty("parts")[0]
    .GetProperty("text").GetString() ?? "{}";


    _logger.LogInformation("[Worker Step 5]: Saving context metrics payload into database...");


     var res4 = await _supabaseClient.From<AudioClass>().Where(x=>x.Id==parsed).Get();
       var record4 = res4.Model;
        if(record4 != null)
            {
                
                record4.Status = "Extracting";
                record4.Summaries = structuredResultJson;


                await record4.Update<AudioClass>();
            }

            await _hubContext.Clients.All.SendAsync("ReceiveStatus", parsed, "Completed");
_logger.LogInformation("🚀 Pipeline executed perfectly and row updated successfully!");




        }



        
        catch (Exception ex)
        {
            _logger.LogError($"[Worker Error]: {ex.Message}");
        }
        
    }

    
}