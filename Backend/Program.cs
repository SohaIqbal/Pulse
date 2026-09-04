
using Amazon.S3;
using Hangfire;
using Hangfire.PostgreSql;
using Backend.Models.Workers;
using backend;
using Microsoft.AspNetCore.SignalR;


ThreadPool.SetMinThreads(workerThreads: 50, completionPortThreads: 50);

var env = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development";
var builder = WebApplication.CreateBuilder(args);

builder.Configuration
    .SetBasePath(AppContext.BaseDirectory)
    .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
    .AddJsonFile($"appsettings.{env}.json", optional: true, reloadOnChange: true)
    .AddEnvironmentVariables();

// Add services to the container.

var supabaseUrl = builder.Configuration["Supabase:Url"];
var supabaseKey = builder.Configuration["Supabase:Key"];
var backblazeKeyId = builder.Configuration["BackblazeB2:KeyId"];
var backblazeApplicationKey = builder.Configuration["BackblazeB2:ApplicationKey"];
// var backblazeEndpoint = "https://s3.us-east-005.backblazeb2.com";
// var backblazeBucketName = "Pulseit";
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")!;
builder.Services.AddScoped(_ =>new Supabase.Client(supabaseUrl!, supabaseKey!));
builder.Services.AddSingleton<IAmazonS3>(_ => 
{
    var s3Config = new AmazonS3Config
    {
        ServiceURL ="https://s3.us-east-005.backblazeb2.com",
        ForcePathStyle = true // Critical setting for Backblaze authentication compatibility
    };
    
    return new AmazonS3Client(backblazeKeyId, backblazeApplicationKey, s3Config);
});
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(builder =>
    {
        builder.WithOrigins("http://localhost:5173") // Replace with your frontend URL
               .AllowAnyHeader()
               .AllowAnyMethod()
               .AllowCredentials(); // If you need to allow credentials
    });
});
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();
builder.Services.AddSignalR(); 

builder.Services.AddHangfire(config => config
.SetDataCompatibilityLevel(CompatibilityLevel.Version_180)


    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
      .UsePostgreSqlStorage(c => c.UseNpgsqlConnection(connectionString), new PostgreSqlStorageOptions
      {
          
          SchemaName = "hangfire",
            QueuePollInterval = TimeSpan.FromSeconds(15),
            PrepareSchemaIfNecessary = true,
          
        
        // Keeps Hangfire's internal connection pool small
        InvisibilityTimeout = TimeSpan.FromMinutes(5)


      }));
builder.Services.AddHangfireServer(options =>
{
    
    options.WorkerCount = 1; // Adjust based on your server's capacity
}); 
builder.Services.AddControllers().AddNewtonsoftJson(); 
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
builder.Services.AddHttpClient<AudioProcessingWorker>();

var app = builder.Build();
// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseExceptionHandler();
// app.UseHttpsRedirection();
app.UseRouting();
app.UseCors();



app.UseAuthentication();

app.UseAuthorization();
app.MapHangfireDashboard("/hangfire");
app.MapHub<PipelineHub>("/api/pipelineHub");

app.MapControllers();



app.Run();
