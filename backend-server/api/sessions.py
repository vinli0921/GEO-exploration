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
from models.session import Session, SessionEvent, Upload, SessionMetrics
from utils.validation import validate_upload_data, filter_events

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

        # Server-side event filtering
        original_count = len(events)
        events = filter_events(events)
        filtered_count = original_count - len(events)

        if filtered_count > 0:
            current_app.logger.info(f'Filtered {filtered_count} low-value events from upload')

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

            # Extract platform and journey fields (trigger will also do this, but explicit is better)
            platform_type = event_data.get('platformType')
            platform_name = event_data.get('platformName')
            query_text = event_data.get('queryText')
            clicked_url = event_data.get('destination') or event_data.get('productUrl')

            # Fix boolean extraction with proper type conversion
            is_ai_attributed_val = event_data.get('isAIToEcommerce', False)
            session_has_ai = event_data.get('sessionHasAIReferrer', False)
            is_ai_attributed = bool(is_ai_attributed_val) if isinstance(is_ai_attributed_val, bool) else \
                               (is_ai_attributed_val == 'true' if isinstance(is_ai_attributed_val, str) else False)
            is_ai_attributed = is_ai_attributed or \
                               (bool(session_has_ai) if isinstance(session_has_ai, bool) else \
                                (session_has_ai == 'true' if isinstance(session_has_ai, str) else False))

            # Fix numeric field extraction with type conversion
            scroll_depth = None
            scroll_depth_val = event_data.get('scrollDepth')
            if scroll_depth_val is not None:
                try:
                    scroll_depth = int(scroll_depth_val)
                except (ValueError, TypeError):
                    current_app.logger.warning(f"Invalid scroll_depth value: {scroll_depth_val}")

            dwell_time_ms = None
            dwell_time_val = event_data.get('dwellTime')
            if dwell_time_val is not None:
                try:
                    dwell_time_ms = int(dwell_time_val)
                except (ValueError, TypeError):
                    current_app.logger.warning(f"Invalid dwell_time value: {dwell_time_val}")

            # Parse timestamp with type validation
            if not timestamp:
                parsed_timestamp = datetime.utcnow()
            else:
                try:
                    # Ensure it's numeric before division
                    timestamp_num = float(timestamp)
                    parsed_timestamp = datetime.fromtimestamp(timestamp_num / 1000)
                except (ValueError, TypeError) as e:
                    current_app.logger.warning(f"Invalid timestamp value: {timestamp}, using current time")
                    parsed_timestamp = datetime.utcnow()

            # Create event object with extracted fields
            event = SessionEvent(
                session_id=session.id,
                upload_id=upload.id,
                event_type=event_type,
                timestamp=parsed_timestamp,
                event_data=event_data,
                url=url,
                title=title,
                tab_id=tab_id,
                platform_type=platform_type,
                platform_name=platform_name,
                query_text=query_text,
                clicked_url=clicked_url,
                is_ai_attributed=is_ai_attributed,
                scroll_depth=scroll_depth,
                dwell_time_ms=dwell_time_ms
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
        # Log full exception details for debugging
        current_app.logger.error(f'Error processing upload: {str(e)}', exc_info=True)
        # Log additional context if available
        try:
            current_app.logger.error(f'Session ID: {session_id}, Events count: {len(data.get("events", []))}')
        except:
            pass
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

        # Calculate average duration for completed sessions
        avg_duration = db.session.query(
            db.func.avg(Session.duration_seconds)
        ).filter(
            Session.is_complete == True,
            Session.duration_seconds != None
        ).scalar() or 0

        return jsonify({
            'total_sessions': total_sessions,
            'active_sessions': active_sessions,
            'complete_sessions': complete_sessions,
            'total_events': total_events,
            'total_participants': total_participants,
            'avg_duration_seconds': int(avg_duration)
        }), 200

    except Exception as e:
        current_app.logger.error(f'Error getting stats: {str(e)}')
        return jsonify({
            'error': 'Failed to get stats',
            'message': str(e)
        }), 500


@sessions_bp.route('/analytics', methods=['GET'])
def get_analytics():
    """Get analytics data for visualizations"""

    try:
        # Get event type distribution
        event_distribution = db.session.query(
            SessionEvent.event_type,
            db.func.count(SessionEvent.id).label('count')
        ).group_by(
            SessionEvent.event_type
        ).order_by(
            db.func.count(SessionEvent.id).desc()
        ).all()

        # Get session timeline (sessions and events per day)
        timeline_data = db.session.query(
            db.func.date(Session.started_at).label('date'),
            db.func.count(Session.id).label('sessions'),
            db.func.sum(Session.total_events).label('events')
        ).group_by(
            db.func.date(Session.started_at)
        ).order_by(
            db.func.date(Session.started_at).asc()
        ).all()

        # Get top participants by session count and events
        top_participants = db.session.query(
            Session.participant_id,
            db.func.count(Session.id).label('session_count'),
            db.func.sum(Session.total_events).label('total_events')
        ).group_by(
            Session.participant_id
        ).order_by(
            db.func.count(Session.id).desc()
        ).limit(10).all()

        return jsonify({
            'event_distribution': [
                {'event_type': event_type, 'count': count}
                for event_type, count in event_distribution
            ],
            'timeline': [
                {
                    'date': date.strftime('%Y-%m-%d') if date else None,
                    'sessions': sessions or 0,
                    'events': int(events) if events else 0
                }
                for date, sessions, events in timeline_data
            ],
            'top_participants': [
                {
                    'participant_id': participant_id,
                    'session_count': session_count,
                    'total_events': int(total_events) if total_events else 0
                }
                for participant_id, session_count, total_events in top_participants
            ]
        }), 200

    except Exception as e:
        current_app.logger.error(f'Error getting analytics: {str(e)}')
        return jsonify({
            'error': 'Failed to get analytics',
            'message': str(e)
        }), 500


@sessions_bp.route('/<int:session_db_id>/compute-metrics', methods=['POST'])
def compute_session_metrics(session_db_id):
    """Compute aggregated metrics for a specific session"""

    try:
        # Check if session exists
        session = Session.query.get(session_db_id)
        if not session:
            return jsonify({'error': 'Session not found'}), 404

        # Call PostgreSQL function to compute metrics
        # The function is defined in migration 002_create_session_metrics.sql
        db.session.execute(
            "SELECT compute_session_metrics(:session_id)",
            {'session_id': session_db_id}
        )
        db.session.commit()

        # Fetch computed metrics
        metrics = SessionMetrics.query.filter_by(session_id=session_db_id).first()

        if not metrics:
            return jsonify({
                'error': 'Failed to compute metrics',
                'message': 'No metrics generated'
            }), 500

        return jsonify({
            'success': True,
            'metrics': metrics.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'Error computing metrics: {str(e)}')
        return jsonify({
            'error': 'Failed to compute metrics',
            'message': str(e)
        }), 500


@sessions_bp.route('/metrics', methods=['GET'])
def get_all_metrics():
    """Get metrics for all sessions with optional filters"""

    try:
        # Get query parameters
        participant_id = request.args.get('participant_id')
        has_conversions = request.args.get('has_conversions')
        has_ai_attribution = request.args.get('has_ai_attribution')
        limit = int(request.args.get('limit', 100))
        offset = int(request.args.get('offset', 0))

        # Build query
        query = db.session.query(SessionMetrics, Session).join(
            Session, SessionMetrics.session_id == Session.id
        )

        if participant_id:
            query = query.filter(Session.participant_id == participant_id)

        if has_conversions and has_conversions.lower() == 'true':
            query = query.filter(SessionMetrics.conversions > 0)

        if has_ai_attribution and has_ai_attribution.lower() == 'true':
            query = query.filter(SessionMetrics.ai_attributed_conversions > 0)

        # Order by most recent first
        query = query.order_by(Session.started_at.desc())

        # Get total count
        total = query.count()

        # Apply pagination
        results = query.limit(limit).offset(offset).all()

        return jsonify({
            'metrics': [
                {
                    **metrics.to_dict(),
                    'session': session.to_dict()
                }
                for metrics, session in results
            ],
            'total': total,
            'limit': limit,
            'offset': offset
        }), 200

    except Exception as e:
        current_app.logger.error(f'Error getting metrics: {str(e)}')
        return jsonify({
            'error': 'Failed to get metrics',
            'message': str(e)
        }), 500


@sessions_bp.route('/metrics/summary', methods=['GET'])
def get_metrics_summary():
    """Get aggregated summary statistics across all sessions"""

    try:
        # Aggregate metrics across all sessions
        summary = db.session.query(
            db.func.count(SessionMetrics.id).label('total_sessions'),
            db.func.sum(SessionMetrics.query_count).label('total_queries'),
            db.func.sum(SessionMetrics.ai_result_clicks).label('total_ai_clicks'),
            db.func.sum(SessionMetrics.conversions).label('total_conversions'),
            db.func.sum(SessionMetrics.ai_attributed_conversions).label('total_ai_conversions'),
            db.func.avg(SessionMetrics.query_count).label('avg_queries_per_session'),
            db.func.avg(SessionMetrics.conversions).label('avg_conversions_per_session'),
            db.func.avg(SessionMetrics.ai_to_purchase_seconds).label('avg_ai_to_purchase_seconds')
        ).first()

        # Platform usage statistics
        platform_stats = db.session.execute("""
            SELECT
                unnest(ai_platforms_used) as platform,
                COUNT(*) as usage_count
            FROM session_metrics
            WHERE ai_platforms_used IS NOT NULL
            GROUP BY platform
            ORDER BY usage_count DESC
        """).fetchall()

        # Conversion rate
        sessions_with_conversions = db.session.query(
            db.func.count(SessionMetrics.id)
        ).filter(SessionMetrics.conversions > 0).scalar()

        total_sessions = summary.total_sessions or 0
        conversion_rate = (sessions_with_conversions / total_sessions * 100) if total_sessions > 0 else 0

        # AI attribution rate
        ai_attribution_rate = 0
        if summary.total_conversions and summary.total_conversions > 0:
            ai_attribution_rate = (summary.total_ai_conversions / summary.total_conversions * 100)

        return jsonify({
            'total_sessions': total_sessions,
            'total_queries': int(summary.total_queries or 0),
            'total_ai_clicks': int(summary.total_ai_clicks or 0),
            'total_conversions': int(summary.total_conversions or 0),
            'total_ai_conversions': int(summary.total_ai_conversions or 0),
            'avg_queries_per_session': float(summary.avg_queries_per_session or 0),
            'avg_conversions_per_session': float(summary.avg_conversions_per_session or 0),
            'avg_ai_to_purchase_seconds': float(summary.avg_ai_to_purchase_seconds or 0) if summary.avg_ai_to_purchase_seconds else None,
            'conversion_rate': round(conversion_rate, 2),
            'ai_attribution_rate': round(ai_attribution_rate, 2),
            'platform_usage': [
                {'platform': row[0], 'usage_count': row[1]}
                for row in platform_stats
            ]
        }), 200

    except Exception as e:
        current_app.logger.error(f'Error getting metrics summary: {str(e)}')
        return jsonify({
            'error': 'Failed to get metrics summary',
            'message': str(e)
        }), 500
