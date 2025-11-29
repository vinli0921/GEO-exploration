"""
Database models for sessions and events
"""

from datetime import datetime
from sqlalchemy.dialects.postgresql import JSONB
from .database import db


class Session(db.Model):
    """Session model - represents a participant's recording session"""

    __tablename__ = 'sessions'

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String(128), unique=True, nullable=False, index=True)
    participant_id = db.Column(db.String(64), nullable=False, index=True)

    # Timestamps
    started_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    ended_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Session metadata
    user_agent = db.Column(db.Text)
    timezone = db.Column(db.String(64))
    screen_width = db.Column(db.Integer)
    screen_height = db.Column(db.Integer)

    # Statistics
    total_events = db.Column(db.Integer, default=0)
    total_pages = db.Column(db.Integer, default=0)
    duration_seconds = db.Column(db.Integer)

    # Status
    is_active = db.Column(db.Boolean, default=True)
    is_complete = db.Column(db.Boolean, default=False)

    # Relationships
    events = db.relationship('SessionEvent', backref='session', lazy='dynamic', cascade='all, delete-orphan')
    uploads = db.relationship('Upload', backref='session', lazy='dynamic', cascade='all, delete-orphan')

    def __repr__(self):
        return f'<Session {self.session_id}>'

    def to_dict(self):
        """Convert session to dictionary"""
        return {
            'id': self.id,
            'session_id': self.session_id,
            'participant_id': self.participant_id,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'ended_at': self.ended_at.isoformat() if self.ended_at else None,
            'duration_seconds': self.duration_seconds,
            'total_events': self.total_events,
            'total_pages': self.total_pages,
            'is_active': self.is_active,
            'is_complete': self.is_complete,
            'user_agent': self.user_agent,
            'timezone': self.timezone
        }


class SessionEvent(db.Model):
    """Session event model - stores individual events"""

    __tablename__ = 'session_events'

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('sessions.id'), nullable=False, index=True)

    # Event details
    event_type = db.Column(db.String(64), nullable=False, index=True)
    timestamp = db.Column(db.DateTime, nullable=False, index=True)

    # Event data (JSONB) - kept for backward compatibility and flexibility
    # Using JSONB for better performance and indexing support
    event_data = db.Column(JSONB, nullable=False)

    # Page context
    url = db.Column(db.Text)
    title = db.Column(db.Text)
    tab_id = db.Column(db.Integer)

    # Extracted fields for fast querying (added via migration)
    platform_type = db.Column(db.String(32), index=True)  # 'ai', 'ecommerce', or 'general'
    platform_name = db.Column(db.String(64), index=True)  # 'chatgpt', 'perplexity', 'amazon', etc.
    query_text = db.Column(db.Text)  # Search query text
    clicked_url = db.Column(db.Text)  # URL clicked by user
    is_ai_attributed = db.Column(db.Boolean, default=False, index=True)  # AI attribution
    scroll_depth = db.Column(db.Integer)  # Scroll depth percentage (0-100)
    dwell_time_ms = db.Column(db.Integer)  # Time spent on page in milliseconds

    # Upload batch tracking
    upload_id = db.Column(db.Integer, db.ForeignKey('uploads.id'), index=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<SessionEvent {self.event_type} at {self.timestamp}>'

    def to_dict(self):
        """Convert event to dictionary"""
        return {
            'id': self.id,
            'event_type': self.event_type,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'event_data': self.event_data,
            'url': self.url,
            'title': self.title,
            'tab_id': self.tab_id,
            'platform_type': self.platform_type,
            'platform_name': self.platform_name,
            'query_text': self.query_text,
            'clicked_url': self.clicked_url,
            'is_ai_attributed': self.is_ai_attributed,
            'scroll_depth': self.scroll_depth,
            'dwell_time_ms': self.dwell_time_ms
        }


class Upload(db.Model):
    """Upload model - tracks batch uploads from extension"""

    __tablename__ = 'uploads'

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('sessions.id'), nullable=False, index=True)

    # Upload details
    upload_timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    event_count = db.Column(db.Integer, nullable=False)
    data_size_bytes = db.Column(db.Integer)

    # Storage
    file_path = db.Column(db.Text)  # Path to stored JSON file
    is_compressed = db.Column(db.Boolean, default=False)

    # Processing status
    is_processed = db.Column(db.Boolean, default=False)
    processed_at = db.Column(db.DateTime)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<Upload {self.id} - {self.event_count} events>'

    def to_dict(self):
        """Convert upload to dictionary"""
        return {
            'id': self.id,
            'upload_timestamp': self.upload_timestamp.isoformat() if self.upload_timestamp else None,
            'event_count': self.event_count,
            'data_size_bytes': self.data_size_bytes,
            'is_processed': self.is_processed,
            'processed_at': self.processed_at.isoformat() if self.processed_at else None
        }


class SessionMetrics(db.Model):
    """Session metrics model - precomputed analytics for fast queries"""

    __tablename__ = 'session_metrics'

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('sessions.id'),
                           unique=True, nullable=False, index=True)

    # Query metrics
    query_count = db.Column(db.Integer, default=0)
    avg_query_length = db.Column(db.Numeric(10, 2))

    # AI engagement metrics
    ai_platforms_used = db.Column(db.ARRAY(db.String))  # Array of platform names
    ai_result_clicks = db.Column(db.Integer, default=0)
    ai_dwell_time_seconds = db.Column(db.Integer, default=0)

    # E-commerce funnel metrics
    ecommerce_visits = db.Column(db.Integer, default=0)
    products_viewed = db.Column(db.Integer, default=0)
    conversions = db.Column(db.Integer, default=0)
    ai_attributed_conversions = db.Column(db.Integer, default=0)

    # Journey timing
    ai_to_purchase_seconds = db.Column(db.Integer)

    # Timestamps
    computed_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    session = db.relationship('Session', backref=db.backref('metrics', uselist=False))

    def __repr__(self):
        return f'<SessionMetrics for session {self.session_id}>'

    def to_dict(self):
        """Convert metrics to dictionary"""
        return {
            'id': self.id,
            'session_id': self.session_id,
            'query_count': self.query_count,
            'avg_query_length': float(self.avg_query_length) if self.avg_query_length else None,
            'ai_platforms_used': self.ai_platforms_used,
            'ai_result_clicks': self.ai_result_clicks,
            'ai_dwell_time_seconds': self.ai_dwell_time_seconds,
            'ecommerce_visits': self.ecommerce_visits,
            'products_viewed': self.products_viewed,
            'conversions': self.conversions,
            'ai_attributed_conversions': self.ai_attributed_conversions,
            'ai_to_purchase_seconds': self.ai_to_purchase_seconds,
            'computed_at': self.computed_at.isoformat() if self.computed_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
