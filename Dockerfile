FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["QLNH_API/QLNH_API.csproj", "QLNH_API/"]
RUN dotnet restore "QLNH_API/QLNH_API.csproj"
COPY . .
WORKDIR "/src/QLNH_API"
RUN dotnet build "QLNH_API.csproj" -c Release -o /app/build

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS publish
WORKDIR /src
COPY --from=build /app/build .
RUN dotnet publish "QLNH_API.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=publish /app/publish .
ENV ASPNETCORE_URLS=http://+:${PORT:-8080}
EXPOSE 8080
ENTRYPOINT ["dotnet", "QLNH_API.dll"]