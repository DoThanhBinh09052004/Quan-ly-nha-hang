# globals.py
from models.revenue_forecast import RevenueForecastModel
from models.recommendation import RecommendationModel
from models.customer_segment import CustomerSegmentModel

# Global model instances
revenue_model = RevenueForecastModel()
recommend_model = RecommendationModel()
segment_model = CustomerSegmentModel()