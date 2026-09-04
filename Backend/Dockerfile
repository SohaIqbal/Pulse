FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src


COPY *.csproj ./
RUN dotnet restore


COPY . .
RUN dotnet build -c Release -o /app/build


FROM build AS publish
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false


FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app


# Install ffmpeg
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*


COPY --from=publish /app/publish .


ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080


ENTRYPOINT ["dotnet", "backend.dll"]
