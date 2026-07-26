import joblib
import os

import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

from config import MODEL_PATH


class CustomerSegmentModel:
    """Clusters customer behaviour from order history or a supplied snapshot."""

    feature_columns = [
        'recency_days', 'frequency', 'monetary_sum', 'monetary_avg',
        'party_avg', 'duration_avg', 'weekend_ratio', 'evening_ratio',
        'tenure_days', 'points', 'account_age_days'
    ]

    def __init__(self, n_clusters=10):
        self.n_clusters = n_clusters
        self.model = None
        self.scaler = None

    def dataframe_from_payload(self, guests):
        rows = []
        for guest in guests:
            features = guest.get('features', {})
            rows.append({
                'guest_id': guest['guest_id'],
                **{column: float(features.get(column, 0)) for column in self.feature_columns}
            })
        return pd.DataFrame(rows, columns=['guest_id', *self.feature_columns])

    def cluster_snapshot(self, guests):
        frame = self.dataframe_from_payload(guests)
        if frame.empty:
            raise ValueError('Guest feature snapshot is empty.')

        cluster_count = min(self.n_clusters, len(frame))
        if cluster_count < 2:
            frame['cluster'] = 0
            centers = frame[self.feature_columns].copy()
            centers.index = [0]
            return frame, centers

        values = frame[self.feature_columns].fillna(0).to_numpy(dtype=float)
        scaler = StandardScaler()
        model = KMeans(n_clusters=cluster_count, random_state=42, n_init=10)
        frame['cluster'] = model.fit_predict(scaler.fit_transform(values))
        centers = pd.DataFrame(
            scaler.inverse_transform(model.cluster_centers_),
            columns=self.feature_columns
        )
        return frame, centers

    def prepare_features(self, df_orders, df_guests):
        """Build the same feature vector used by the BE customer snapshot."""
        if df_orders.empty or df_guests.empty:
            return pd.DataFrame(columns=self.feature_columns), pd.DataFrame()

        orders = df_orders.copy()
        guests = df_guests.copy()
        orders['order_date'] = pd.to_datetime(orders['order_date'], errors='coerce')
        orders['CheckInTime'] = pd.to_datetime(orders.get('CheckInTime'), errors='coerce')
        orders['FinalPrice'] = pd.to_numeric(orders.get('FinalPrice'), errors='coerce').fillna(0)
        orders['PartySize'] = pd.to_numeric(orders.get('PartySize'), errors='coerce').fillna(0)
        orders['duration_minutes'] = pd.to_numeric(orders.get('duration_minutes'), errors='coerce').fillna(0)
        orders = orders.dropna(subset=['GuestId', 'order_date'])
        if orders.empty:
            return pd.DataFrame(columns=self.feature_columns), pd.DataFrame()

        reference_date = max(pd.Timestamp.now(), orders['order_date'].max())
        orders['is_weekend'] = (orders['order_date'].dt.dayofweek >= 5).astype(float)
        orders['is_evening'] = (orders['CheckInTime'].dt.hour >= 18).fillna(False).astype(float)
        stats = orders.groupby('GuestId').agg(
            last_order=('order_date', 'max'),
            first_order=('order_date', 'min'),
            frequency=('order_id', 'count'),
            monetary_sum=('FinalPrice', 'sum'),
            monetary_avg=('FinalPrice', 'mean'),
            party_avg=('PartySize', 'mean'),
            duration_avg=('duration_minutes', 'mean'),
            weekend_ratio=('is_weekend', 'mean'),
            evening_ratio=('is_evening', 'mean'),
        ).reset_index()
        stats['recency_days'] = (reference_date - stats['last_order']).dt.days.clip(lower=0)
        stats['tenure_days'] = (reference_date - stats['first_order']).dt.days.clip(lower=0)

        guests['Created'] = pd.to_datetime(guests.get('Created'), errors='coerce')
        guests['points'] = pd.to_numeric(guests.get('Points', guests.get('points', 0)), errors='coerce').fillna(0)
        guests['account_age_days'] = (reference_date - guests['Created']).dt.days.clip(lower=0).fillna(0)
        result = stats.merge(
            guests[['guest_id', 'points', 'account_age_days']],
            left_on='GuestId', right_on='guest_id', how='inner'
        )
        features = result[self.feature_columns].replace([float('inf'), float('-inf')], 0).fillna(0)
        return features, result

    def train(self, df_orders, df_guests):
        """Train a persisted K-Means model from completed orders and guests."""
        features, frame = self.prepare_features(df_orders, df_guests)
        if features.empty:
            raise ValueError('No guest order history is available to train customer segmentation.')

        cluster_count = min(self.n_clusters, len(features))
        self.scaler = StandardScaler()
        scaled_features = self.scaler.fit_transform(features)
        self.model = KMeans(n_clusters=cluster_count, random_state=42, n_init=10)
        frame['cluster'] = self.model.fit_predict(scaled_features)
        return frame

    def predict(self, guest_features):
        if self.model is None or self.scaler is None:
            raise RuntimeError('No persisted customer segment model is available.')
        if isinstance(guest_features, dict):
            guest_features = [guest_features.get(column, 0) for column in self.feature_columns]
        feature_frame = pd.DataFrame([guest_features], columns=self.feature_columns)
        return self.model.predict(self.scaler.transform(feature_frame))[0]

    def save_model(self, filename='customer_segment.pkl'):
        if self.model is None or self.scaler is None:
            return
        os.makedirs(MODEL_PATH, exist_ok=True)
        joblib.dump({'model': self.model, 'scaler': self.scaler}, os.path.join(MODEL_PATH, filename))

    def load_model(self, filename='customer_segment.pkl'):
        data = joblib.load(os.path.join(MODEL_PATH, filename))
        self.model = data['model']
        self.scaler = data['scaler']
