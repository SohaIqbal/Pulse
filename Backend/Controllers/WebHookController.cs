using Microsoft.AspNetCore.Mvc;
using Hangfire;
using System.Text.Json.Serialization;

using Backend.Models.Workers;
namespace Webhook.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class WebHookController : ControllerBase
    {
        private readonly IBackgroundJobClient _backgroundJobs;


        public WebHookController(IBackgroundJobClient backgroundJobs)
        {
            _backgroundJobs = backgroundJobs;
        }
       

        [HttpPost("supabase-audio-insert")]


        public IActionResult HandleAudio([FromBody] SupabaseWebhookPayload payload)
        {
            Console.WriteLine("Received Supabase webhook payload:");
              Response.Headers.Append("ngrok-skip-browser-warning", "true");

            if(payload?.Record == null)
            {
                return BadRequest("No data provided.");
            }

            if(payload.Record.Status ==0 )
            {
                _backgroundJobs.Enqueue<AudioProcessingWorker>(worker =>  worker.ProcessAudioPipeline(payload.Record.Id, payload.Record.Filename));


                return Ok("Audio processing job enqueued.");
            }
            return Ok("Audio record status is not 0, no processing needed.");
          
        }



        public class SupabaseWebhookPayload
    {
        [JsonPropertyName("record")]
        public AudioRecord? Record { get; set; }
    }

    public class AudioRecord
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("filename")]
        public string Filename { get; set; } = string.Empty;

        [JsonPropertyName("status")]
        public int Status { get; set; }
    }

        
    }
    
}