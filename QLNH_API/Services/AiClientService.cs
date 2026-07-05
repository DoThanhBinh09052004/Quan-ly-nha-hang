using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using QLNH_API.Data;
using QLNH_API.DTO;

namespace QLNH_API.Services
{
    public class AiClientService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ApplicationDbcontext _context; 

        public AiClientService(IHttpClientFactory httpClientFactory,ApplicationDbcontext context)
        {
            _httpClientFactory = httpClientFactory;
            _context = context;
        }

        public async Task<RevenueAiPredictResponseDto> PredictRevenueAsync(string dateIso, CancellationToken cancellationToken = default)
        {
            var client = _httpClientFactory.CreateClient("AiService");
            var payload = new AiPredictBody { Date = dateIso };

            using var response = await client.PostAsJsonAsync("predict/revenue", payload, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                throw new HttpRequestException($"AI service {(int)response.StatusCode}: {errorBody}");
            }

            var dto = await response.Content.ReadFromJsonAsync<RevenueAiPredictResponseDto>(
                new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true },
                cancellationToken);

            if (dto == null)
                throw new InvalidOperationException("AI response could not be parsed.");

            return dto;
        }

        public async Task<List<AiRecommendationItemDto>> RecommendForTableAsync(
            List<string> currentItems,
            int topN = 5,
            CancellationToken cancellationToken = default)
        {
            var client = _httpClientFactory.CreateClient("AiService");
            var payload = new AiRecommendBody { CurrentItems = currentItems ?? new List<string>(), TopN = topN };

            using var response = await client.PostAsJsonAsync("recommend/for-table", payload, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                throw new HttpRequestException($"AI service {(int)response.StatusCode}: {errorBody}");
            }

            var dto = await response.Content.ReadFromJsonAsync<List<AiRecommendationItemDto>>(
                new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true },
                cancellationToken);

            return dto ?? new List<AiRecommendationItemDto>();
        }

        public async Task<List<AiRecommendationItemDto>> AnalyzeMarketBasketAsync(
            List<string> items,
            int topN = 5,
            CancellationToken cancellationToken = default)
        {
            var client = _httpClientFactory.CreateClient("AiService");
            var payload = new AiMarketBasketBody { Items = items ?? new List<string>(), TopN = topN };

            using var response = await client.PostAsJsonAsync("analyze/market-basket", payload, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                throw new HttpRequestException($"AI service {(int)response.StatusCode}: {errorBody}");
            }

            var dto = await response.Content.ReadFromJsonAsync<List<AiRecommendationItemDto>>(
                new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true },
                cancellationToken);

            return dto ?? new List<AiRecommendationItemDto>();
        }

        public async Task<AiCustomerSegmentResponseDto> GetCustomerSegmentAsync(
            int guestId,
            CancellationToken cancellationToken = default)
        {
            var client = _httpClientFactory.CreateClient("AiService");
            var payload = new AiCustomerSegmentBody { GuestId = guestId };

            using var response = await client.PostAsJsonAsync("analyze/customer-segment", payload, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                throw new HttpRequestException($"AI service {(int)response.StatusCode}: {errorBody}");
            }

            var dto = await response.Content.ReadFromJsonAsync<AiCustomerSegmentResponseDto>(
                new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true },
                cancellationToken);

            if (dto == null)
                throw new InvalidOperationException("AI response could not be parsed.");

            return dto;
        }
        public async Task<List<AiIngredientRestockRowDto>> GetIngredientRestockForecastAsync(
            int days = 14,
            CancellationToken cancellationToken = default)
        {
            var client = _httpClientFactory.CreateClient("AiService");

            using var response = await client.GetAsync($"ingredient/forecast?days={days}", cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                throw new HttpRequestException($"AI service {(int)response.StatusCode}: {errorBody}");
            }

            var dto = await response.Content.ReadFromJsonAsync<List<AiIngredientRestockRowDto>>(
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true },
                cancellationToken);

            return dto ?? new List<AiIngredientRestockRowDto>();
        }

        public async Task<List<AiIngredientDailyForecastRowDto>> GetIngredientDailyForecastAsync(
            int ingredientId,
            int days = 14,
            CancellationToken cancellationToken = default)
        {
            var client = _httpClientFactory.CreateClient("AiService");

            using var response = await client.GetAsync($"ingredient/forecast/{ingredientId}?days={days}", cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                throw new HttpRequestException($"AI service {(int)response.StatusCode}: {errorBody}");
            }

            var dto = await response.Content.ReadFromJsonAsync<List<AiIngredientDailyForecastRowDto>>(
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true },
                cancellationToken);

            return dto ?? new List<AiIngredientDailyForecastRowDto>();
        }
        public async Task<AiBusinessChatResponseDto> AnalyzeBusinessAsync(AiBusinessChatRequestDto request,CancellationToken cancellationToken = default)
        {
            var client = _httpClientFactory.CreateClient("AiService");

            using var response = await client.PostAsJsonAsync("chat/business", request, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                throw new HttpRequestException($"AI service {(int)response.StatusCode}: {errorBody}");
            }

            var dto = await response.Content.ReadFromJsonAsync<AiBusinessChatResponseDto>(
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true },
                cancellationToken);

            if (dto == null)
                throw new InvalidOperationException("AI response could not be parsed.");

            return dto;
        }
        public async Task<object> GetItemsForChatbot(int take = 300)
        {
           
            var items = await _context.Item
                .Include(i => i.Category)
                .Where(i => !i.Deleted)
                .OrderBy(i => i.Name)
                .Take(take)
                .Select(i => new
                {
                    Id = i.Id,
                    Name = i.Name,
                    Price = i.Price,
                    Discount = i.Discount,
                    Quantity = i.Quantity,
                    IsAvailable = i.IsAvailable,
                    PreparationTime = i.PreparationTime,
                 
                    Category = i.Category == null ? null : new
                    {
                        Name = i.Category.Name
                    },

                })
                .ToListAsync();

            return items;
        }
        private sealed class AiPredictBody
        {
            [JsonPropertyName("date")]
            public string Date { get; set; } = "";
        }

        private sealed class AiRecommendBody
        {
            [JsonPropertyName("current_items")]
            public List<string> CurrentItems { get; set; } = new();

            [JsonPropertyName("top_n")]
            public int TopN { get; set; } = 5;
        }

        private sealed class AiMarketBasketBody
        {
            [JsonPropertyName("items")]
            public List<string> Items { get; set; } = new();

            [JsonPropertyName("top_n")]
            public int TopN { get; set; } = 5;
        }

        private sealed class AiCustomerSegmentBody
        {
            [JsonPropertyName("guest_id")]
            public int GuestId { get; set; }
        }
    }

    public sealed class AiRecommendationItemDto
    {
        [JsonPropertyName("item")]
        public string Item { get; set; } = "";

        [JsonPropertyName("confidence")]
        public double Confidence { get; set; }

        [JsonPropertyName("lift")]
        public double Lift { get; set; }
    }

    public sealed class AiCustomerSegmentResponseDto
    {
        [JsonPropertyName("guest_id")]
        public int GuestId { get; set; }

        [JsonPropertyName("cluster")]
        public int Cluster { get; set; }

        [JsonPropertyName("cluster_name")]
        public string ClusterName { get; set; } = "";

        [JsonPropertyName("cluster_description")]
        public string ClusterDescription { get; set; } = "";

        [JsonPropertyName("cluster_traits")]
        public List<string> ClusterTraits { get; set; } = new();

        [JsonPropertyName("guest_profile_name")]
        public string GuestProfileName { get; set; } = "";

        [JsonPropertyName("guest_profile_description")]
        public string GuestProfileDescription { get; set; } = "";

        [JsonPropertyName("guest_profile_traits")]
        public List<string> GuestProfileTraits { get; set; } = new();

        [JsonPropertyName("features")]
        public Dictionary<string, JsonElement> Features { get; set; } = new();
    }
    public sealed class AiIngredientRestockRowDto
    {
        [JsonPropertyName("ingredient_id")]
        public int IngredientId { get; set; }

        // FastAPI trả key "Name", "Unit" (đúng chữ hoa)
        [JsonPropertyName("Name")]
        public string Name { get; set; } = "";

        [JsonPropertyName("Unit")]
        public string Unit { get; set; } = "";

        [JsonPropertyName("StockQuantity")]
        public double StockQuantity { get; set; }

        [JsonPropertyName("MinStock")]
        public double MinStock { get; set; }

        [JsonPropertyName("forecast_total_used")]
        public double ForecastTotalUsed { get; set; }

        [JsonPropertyName("suggested_buy")]
        public double SuggestedBuy { get; set; }
    }

    public sealed class AiIngredientDailyForecastRowDto
    {
        [JsonPropertyName("date")]
        public string Date { get; set; } = "";

        [JsonPropertyName("ingredient_id")]
        public int IngredientId { get; set; }

        [JsonPropertyName("predicted_qty_used")]
        public double PredictedQtyUsed { get; set; }
    }
}
