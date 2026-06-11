using AutoMapper;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using QLNH_API.Data;
using QLNH_API.Mapppings;
using Microsoft.OpenApi.Models;
using QLNH_API.Services;
using System.Text;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

var builder = WebApplication.CreateBuilder(args);

// ---------------- JWT CONFIG ----------------
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"])
            ),
            RoleClaimType = ClaimTypes.Role
        };
    });

builder.Services.AddAuthorization();

// ---------------- CORS ----------------
var MyAllowSpecificOrigins = "_myAllowSpecificOrigins";
builder.Services.AddCors(options =>
{
    options.AddPolicy(name: MyAllowSpecificOrigins, policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// ---------------- JSON + CONTROLLERS ----------------
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // allow input JSON different case
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;

        // IMPORTANT: output JSON camelCase (fix frontend mapping)
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;

        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
    });

// ---------------- AUTO MAPPER ----------------
builder.Services.AddAutoMapper(typeof(MappingProfile).Assembly);

// ---------------- DATABASE ----------------
builder.Services.AddDbContext<ApplicationDbcontext>(options =>
    options.UseMySql(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        new MySqlServerVersion(new Version(8, 0, 41))
    )
);

// ---------------- HTTP CLIENT (AI SERVICE) ----------------
builder.Services.AddHttpClient("AiService", (sp, client) =>
{
    var baseUrl = sp.GetRequiredService<IConfiguration>()["AiService:BaseUrl"] ?? "http://localhost:8000";
    client.BaseAddress = new Uri(baseUrl.TrimEnd('/') + "/");
    client.Timeout = TimeSpan.FromSeconds(120);
});

// ---------------- SERVICES ----------------
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<RevenueService>();
builder.Services.AddScoped<AiClientService>();
builder.Services.AddHostedService<PaymentExpiryService>();

// ---------------- SWAGGER ----------------
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Nhập token JWT. Ví dụ: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6..."
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });

    options.OperationFilter<FormFileOperationFilter>();
});

var app = builder.Build();

if (builder.Configuration.GetValue<bool>("Database:RunMigrationsOnStartup"))
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbcontext>();
    dbContext.Database.Migrate();
}

// ---------------- SWAGGER ----------------
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "QLNH API v1");
    c.RoutePrefix = "swagger";
});

app.MapGet("/", () => Results.Redirect("/swagger"));

// ---------------- FIX 401/403 JSON RESPONSE ----------------
app.Use(async (context, next) =>
{
    await next();

    if (context.Response.StatusCode == 401 || context.Response.StatusCode == 403)
    {
        if (!context.Response.HasStarted)
        {
            context.Response.ContentType = "application/json";
            var message = context.Response.StatusCode == 401
                ? "Unauthorized - Vui lòng đăng nhập"
                : "Forbidden - Bạn không có quyền";

            // Keep consistent camelCase output like the rest of API
            var jsonResponse = System.Text.Json.JsonSerializer.Serialize(
                new { error = message },
                new System.Text.Json.JsonSerializerOptions
                {
                    PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase
                }
            );

            await context.Response.WriteAsync(jsonResponse);
        }
    }
});

// ---------------- MIDDLEWARE ORDER (RẤT QUAN TRỌNG) ----------------
app.UseHttpsRedirection();
app.UseCors(MyAllowSpecificOrigins);

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
