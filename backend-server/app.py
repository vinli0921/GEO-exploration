"""
Flask API Server for LLM Search Behavior Study
Receives and stores session data from Chrome extension
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import json
import os
from pathlib import Path
from sqlalchemy import text

from models.database import db, init_db
from models.session import Session, SessionEvent
from api.sessions import sessions_bp
from utils.compression import compress_data, decompress_data

# Initialize Flask app
app = Flask(__name__)

# Configuration - PostgreSQL is REQUIRED (JSONB and ARRAY types not supported by SQLite)
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL environment variable is required.\n"
        "This application requires PostgreSQL for JSONB and ARRAY support.\n"
        "Example: DATABASE_URL=postgresql://user:pass@host:5432/dbname"
    )

# Validate PostgreSQL (reject SQLite)
if DATABASE_URL.startswith('sqlite'):
    raise RuntimeError(
        "SQLite is not supported by this application.\n"
        "PostgreSQL-specific features (JSONB, ARRAY) are required.\n"
        "Please configure DATABASE_URL with a PostgreSQL connection string."
    )

app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max request size
app.config['DATA_STORAGE_PATH'] = os.getenv('DATA_STORAGE_PATH', './data/sessions')

# Enable CORS for Chrome extension
# Note: In production, replace with specific extension ID
CORS(app, resources={
    r"/api/*": {
        "origins": "*",  # Allow all origins (for development with Chrome extensions)
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": False
    }
})

# Initialize database
init_db(app)

# Register blueprints
app.register_blueprint(sessions_bp, url_prefix='/api/sessions')

# Ensure data storage directory exists
Path(app.config['DATA_STORAGE_PATH']).mkdir(parents=True, exist_ok=True)


@app.route('/')
def index():
    """API root endpoint"""
    return jsonify({
        'name': 'LLM Search Behavior Study API',
        'version': '1.0.0',
        'status': 'running',
        'endpoints': {
            'sessions': '/api/sessions',
            'health': '/api/health'
        }
    })


@app.route('/api/health')
def health():
    """Health check endpoint"""
    try:
        # Check database connection
        db.session.execute(text('SELECT 1'))

        return jsonify({
            'status': 'healthy',
            'database': 'connected',
            'timestamp': datetime.utcnow().isoformat()
        })
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500


@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({
        'error': 'Not found',
        'message': 'The requested resource was not found'
    }), 404


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    db.session.rollback()
    return jsonify({
        'error': 'Internal server error',
        'message': 'An unexpected error occurred'
    }), 500


# Initialize database tables
with app.app_context():
    try:
        db.create_all()
    except Exception as e:
        # Tables may already exist
        pass

if __name__ == '__main__':
    # Run development server
    app.run(
        host='0.0.0.0',
        port=int(os.getenv('PORT', 5000)),
        debug=os.getenv('DEBUG', 'True').lower() == 'true'
    )
