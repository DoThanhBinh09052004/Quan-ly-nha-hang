FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["QLNH_API/QLNH_API.csproj", "QLNH_API/"]
RUN dotnet restore "QLNH_API/QLNH_API.csproj"
COPY . .
WORKDIR "/src/QLNH_API"
RUN dotnet publish "QLNH_API.csproj" -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "QLNH_API.dll"]
