"""
Sessions API endpoints
Handles session data upload, retrieval, and export
"""

from flask import Blueprint, request, jsonify, current_app, send_file
from datetime import datetime
from pathlib import Path
import json
import gzip

from models.database import db
from models.session import Session, SessionEvent, Upload
from utils.validation import validate_upload_data

sessions_bp = Blueprint('sessions', __name__)


@sessions_bp.route('/upload', methods=['POST', 'OPTIONS'])
def upload_session_data():
    """Upload session data from Chrome extension"""

    # Handle CORS preflight
    if request.method == 'OPTIONS':
        return '', 204

    try:
        # Get request data
        data = request.get_json()

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # Validate data
        validation_error = validate_upload_data(data)
        if validation_error:
            return jsonify({'error': validation_error}), 400

        # Extract session info
        session_id = data.get('sessionId')
        participant_id = data.get('participantId')
        events = data.get('events', [])
        upload_timestamp = data.get('uploadTimestamp')

        # Find or create session
        session = Session.query.filter_by(session_id=session_id).first()

        if not session:
            # Create new session
            session = Session(
                session_id=session_id,
                participant_id=participant_id
            )

            # Extract metadata from first event
            if events:
                first_event = events[0]
                if first_event.get('type') == 'session_start':
                    session.user_agent = first_event.get('userAgent')
                    session.timezone = first_event.get('timezone')
                    session.started_at = datetime.fromtimestamp(first_event.get('timestamp', 0) / 1000)

            db.session.add(session)
            db.session.flush()  # Get session ID

        # Create upload record
        upload = Upload(
            session_id=session.id,
            upload_timestamp=datetime.fromtimestamp(upload_timestamp / 1000) if upload_timestamp else datetime.utcnow(),
            event_count=len(events),
            data_size_bytes=len(json.dumps(data))
        )
        db.session.add(upload)
        db.session.flush()  # Get upload ID

        # Save raw data to file
        data_dir = Path(current_app.config['DATA_STORAGE_PATH'])
        session_dir = data_dir / participant_id / session_id
        session_dir.mkdir(parents=True, exist_ok=True)

        filename = f'upload_{upload.id}_{datetime.utcnow().strftime("%Y%m%d_%H%M%S")}.json.gz'
        filepath = session_dir / filename

        # Compress and save
        with gzip.open(filepath, 'wt', encoding='utf-8') as f:
            json.dump(data, f, indent=2)

        upload.file_path = str(filepath)
        upload.is_compressed = True

        # Process events
        event_objects = []
        unique_urls = set()

        for event_data in events:
            event_type = event_data.get('type')
            timestamp = event_data.get('timestamp')
            url = event_data.get('url')
            title = event_data.get('title')
            tab_id = event_data.get('tabId')

            if url:
                unique_urls.add(url)

            # Create event object
            event = SessionEvent(
                session_id=session.id,
                upload_id=upload.id,
                event_type=event_type,
                timestamp=datetime.fromtimestamp(timestamp / 1000) if timestamp else datetime.utcnow(),
                event_data=event_data,
                url=url,
                title=title,
                tab_id=tab_id
            )
            event_objects.append(event)

        # Bulk insert events
        if event_objects:
            db.session.bulk_save_objects(event_objects)

        # Update session statistics
        session.total_events += len(events)
        session.total_pages = len(unique_urls)

        # Check for session end event
        for event_data in events:
            if event_data.get('type') == 'session_end':
                session.is_active = False
                session.is_complete = True
                session.ended_at = datetime.fromtimestamp(event_data.get('timestamp', 0) / 1000)
                session.duration_seconds = event_data.get('duration', 0) // 1000

        # Mark upload as processed
        upload.is_processed = True
        upload.processed_at = datetime.utcnow()

        # Commit transaction
        db.session.commit()

        return jsonify({
            'success': True,
            'session_id': session_id,
            'events_received': len(events),
            'upload_id': upload.id
        }), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'Error processing upload: {str(e)}')
        return jsonify({
            'error': 'Failed to process upload',
            'message': str(e)
        }), 500


@sessions_bp.route('/list', methods=['GET'])
def list_sessions():
    """List all sessions with optional filters"""

    try:
        # Get query parameters
        participant_id = request.args.get('participant_id')
        is_active = request.args.get('is_active')
        is_complete = request.args.get('is_complete')
        limit = int(request.args.get('limit', 100))
        offset = int(request.args.get('offset', 0))

        # Build query
        query = Session.query

        if participant_id:
            query = query.filter_by(participant_id=participant_id)
        if is_active is not None:
            query = query.filter_by(is_active=is_active.lower() == 'true')
        if is_complete is not None:
            query = query.filter_by(is_complete=is_complete.lower() == 'true')

        # Order by most recent first
        query = query.order_by(Session.started_at.desc())

        # Get total count
        total = query.count()

        # Apply pagination
        sessions = query.limit(limit).offset(offset).all()

        return jsonify({
            'sessions': [session.to_dict() for session in sessions],
            'total': total,
            'limit': limit,
            'offset': offset
        }), 200

    except Exception as e:
        current_app.logger.error(f'Error listing sessions: {str(e)}')
        return jsonify({
            'error': 'Failed to list sessions',
            'message': str(e)
        }), 500


@sessions_bp.route('/<session_id>', methods=['GET'])
def get_session(session_id):
    """Get detailed session information"""

    try:
        session = Session.query.filter_by(session_id=session_id).first()

        if not session:
            return jsonify({'error': 'Session not found'}), 404

        # Include event summary
        event_summary = db.session.query(
            SessionEvent.event_type,
            db.func.count(SessionEvent.id).label('count')
        ).filter_by(
            session_id=session.id
        ).group_by(
            SessionEvent.event_type
        ).all()

        session_dict = session.to_dict()
        session_dict['event_summary'] = {event_type: count for event_type, count in event_summary}
        session_dict['uploads'] = [upload.to_dict() for upload in session.uploads]

        return jsonify(session_dict), 200

    except Exception as e:
        current_app.logger.error(f'Error getting session: {str(e)}')
        return jsonify({
            'error': 'Failed to get session',
            'message': str(e)
        }), 500


@sessions_bp.route('/<session_id>/events', methods=['GET'])
def get_session_events(session_id):
    """Get events for a session"""

    try:
        session = Session.query.filter_by(session_id=session_id).first()

        if not session:
            return jsonify({'error': 'Session not found'}), 404

        # Get query parameters
        event_type = request.args.get('event_type')
        limit = int(request.args.get('limit', 1000))
        offset = int(request.args.get('offset', 0))

        # Build query
        query = SessionEvent.query.filter_by(session_id=session.id)

        if event_type:
            query = query.filter_by(event_type=event_type)

        # Order by timestamp
        query = query.order_by(SessionEvent.timestamp.asc())

        # Get total count
        total = query.count()

        # Apply pagination
        events = query.limit(limit).offset(offset).all()

        return jsonify({
            'events': [event.to_dict() for event in events],
            'total': total,
            'limit': limit,
            'offset': offset
        }), 200

    except Exception as e:
        current_app.logger.error(f'Error getting events: {str(e)}')
        return jsonify({
            'error': 'Failed to get events',
            'message': str(e)
        }), 500


@sessions_bp.route('/<session_id>/export', methods=['GET'])
def export_session(session_id):
    """Export complete session data as JSON"""

    try:
        session = Session.query.filter_by(session_id=session_id).first()

        if not session:
            return jsonify({'error': 'Session not found'}), 404

        # Get all events
        events = SessionEvent.query.filter_by(
            session_id=session.id
        ).order_by(
            SessionEvent.timestamp.asc()
        ).all()

        # Build export data
        export_data = {
            'session': session.to_dict(),
            'events': [event.to_dict() for event in events],
            'export_timestamp': datetime.utcnow().isoformat(),
            'event_count': len(events)
        }

        # Create temporary file
        export_dir = Path(current_app.config['DATA_STORAGE_PATH']) / 'exports'
        export_dir.mkdir(parents=True, exist_ok=True)

        filename = f'session_{session_id}_{datetime.utcnow().strftime("%Y%m%d_%H%M%S")}.json'
        filepath = export_dir / filename

        with open(filepath, 'w') as f:
            json.dump(export_data, f, indent=2)

        return send_file(
            filepath,
            as_attachment=True,
            download_name=filename,
            mimetype='application/json'
        )

    except Exception as e:
        current_app.logger.error(f'Error exporting session: {str(e)}')
        return jsonify({
            'error': 'Failed to export session',
            'message': str(e)
        }), 500


@sessions_bp.route('/stats', methods=['GET'])
def get_stats():
    """Get overall statistics"""

    try:
        total_sessions = Session.query.count()
        active_sessions = Session.query.filter_by(is_active=True).count()
        complete_sessions = Session.query.filter_by(is_complete=True).count()
        total_events = db.session.query(db.func.sum(Session.total_events)).scalar() or 0
        total_participants = db.session.query(db.func.count(db.func.distinct(Session.participant_id))).scalar() or 0

        return jsonify({
            'total_sessions': total_sessions,
            'active_sessions': active_sessions,
            'complete_sessions': complete_sessions,
            'total_events': total_events,
            'total_participants': total_participants
        }), 200

    except Exception as e:
        current_app.logger.error(f'Error getting stats: {str(e)}')
        return jsonify({
            'error': 'Failed to get stats',
            'message': str(e)
        }), 500
