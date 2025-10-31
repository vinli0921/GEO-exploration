"""
Database models for sessions and events
"""

from datetime import datetime
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

    # Event data (JSON)
    event_data = db.Column(db.JSON, nullable=False)

    # Page context
    url = db.Column(db.Text)
    title = db.Column(db.Text)
    tab_id = db.Column(db.Integer)

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
            'tab_id': self.tab_id
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
