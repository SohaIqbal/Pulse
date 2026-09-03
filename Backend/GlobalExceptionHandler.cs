using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Diagnostics;





namespace backend;


public class GlobalExceptionHandler : IExceptionHandler
{
    
    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken cancellationToken = default)
    {
        

        var (statusCode, message)= exception switch
        {

            ArgumentException => (StatusCodes.Status400BadRequest, "An invalid argument was provided."),
            
            UnauthorizedAccessException => (StatusCodes.Status401Unauthorized, "You are not authorized to perform this action."),
            KeyNotFoundException => (StatusCodes.Status404NotFound, "The requested resource was not found."),
            _ => (StatusCodes.Status500InternalServerError, "An unexpected error occurred.")


            
        };

        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";

        var response = new
        {
            
            StatusCode = statusCode,
            Message = message,
            Details=exception.Message
        };


        await context.Response.WriteAsJsonAsync(response, cancellationToken: cancellationToken);
        return true;
    }




       
    
}