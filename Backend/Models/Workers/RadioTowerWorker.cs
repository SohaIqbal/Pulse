using Microsoft.AspNetCore.SignalR;
namespace Backend.Models.Workers;
using Supabase;

using AudioClass = Backend.Models.Audio;
public class PipelineHub:Hub
{

     private readonly Client _supabaseClient;


     public PipelineHub(Client supabaseClient)
    {
        _supabaseClient = supabaseClient;
    }


     public async Task<string> GetCurrentStatus(string audioId)
    {
        var parsed = Guid.Parse(audioId);
        var res = await _supabaseClient.From<AudioClass>().Where(x => x.Id == parsed).Get();
        var record = res.Model;
        return record?.Status ?? "Transcoding";
    }

    public async Task<string> GetSummary(string audioId)
    {
        var parsed = Guid.Parse(audioId);
        var res = await _supabaseClient.From<AudioClass>().Where(x => x.Id == parsed).Get();
        var record = res.Model;
        return record?.Summaries!;
    }

    public async Task<string> GetDetectedLanguage(string audioId)
    {
        var parsed = Guid.Parse(audioId);
        var res = await _supabaseClient.From<AudioClass>().Where(x => x.Id == parsed).Get();
        var record = res.Model;
        return record?.Detected_Lang!;
    }
    

}