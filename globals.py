# globals.py
from models.revenue_forecast import RevenueForecastModel
from models.recommendation import RecommendationModel
from models.customer_segment import CustomerSegmentModel
from models.ingredient_demand import IngredientDemandModel

# Global model instances
revenue_model = RevenueForecastModel()
recommend_model = RecommendationModel()
segment_model = CustomerSegmentModel()
ingredient_demand_model = IngredientDemandModel()
