using AutoMapper;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using QLNH_API.Data;
using QLNH_API.Mapppings;
using Microsoft.OpenApi.Models;
using QLNH_API.Services;
using System.Text;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc; // <-- Thêm để dùng [ApiController]

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
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
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
    .EnableSensitiveDataLogging()
    .LogTo(Console.WriteLine)
);

// ---------------- SERVICES ----------------
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<RevenueService>();

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

// ---------------- DEVELOPMENT ONLY ----------------
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "QLNH API v1");
        c.RoutePrefix = "swagger";
    });
}

// ---------------- FIX LỖI "Unexpected token 'A'" (QUAN TRỌNG NHẤT) ----------------
// Đây là nguyên nhân chính gây lỗi HTML trả về thay vì JSON
app.Use(async (context, next) =>
{
    await next();

    // Nếu chưa login và truy cập API cần auth → trả JSON 401 thay vì HTML login page
    if (context.Response.StatusCode == 401 || context.Response.StatusCode == 403)
    {
        if (!context.Response.HasStarted)
        {
            context.Response.ContentType = "application/json";
            var message = context.Response.StatusCode == 401
                ? "Unauthorized - Vui lòng đăng nhập"
                : "Forbidden - Bạn không có quyền";

            var jsonResponse = System.Text.Json.JsonSerializer.Serialize(
                new { error = message },
                new System.Text.Json.JsonSerializerOptions { PropertyNamingPolicy = null }
            );

            await context.Response.WriteAsync(jsonResponse);
        }
    }
});

// ---------------- MIDDLEWARE ORDER (RẤT QUAN TRỌNG) ----------------
app.UseHttpsRedirection();
app.UseCors(MyAllowSpecificOrigins);

app.UseAuthentication();  // Phải đứng trước UseAuthorization
app.UseAuthorization();

app.MapControllers();

app.Run();