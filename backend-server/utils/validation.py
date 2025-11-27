"""
Data validation utilities
"""


def validate_upload_data(data):
    """
    Validate uploaded session data
    Returns error message if invalid, None if valid
    """

    if not isinstance(data, dict):
        return 'Data must be a JSON object'

    # Required fields
    required_fields = ['sessionId', 'participantId', 'events']

    for field in required_fields:
        if field not in data:
            return f'Missing required field: {field}'

    # Validate sessionId
    session_id = data.get('sessionId')
    if not isinstance(session_id, str) or len(session_id) == 0:
        return 'Invalid sessionId'

    # Validate participantId
    participant_id = data.get('participantId')
    if not isinstance(participant_id, str) or len(participant_id) == 0:
        return 'Invalid participantId'

    # Validate events
    events = data.get('events')
    if not isinstance(events, list):
        return 'Events must be an array'

    if len(events) == 0:
        return 'No events provided'

    # Validate each event
    for i, event in enumerate(events):
        if not isinstance(event, dict):
            return f'Event {i} is not an object'

        if 'type' not in event:
            return f'Event {i} missing type'

        if 'timestamp' not in event:
            return f'Event {i} missing timestamp'

    return None


def filter_events(events):
    """
    Filter events to keep only high-value events for GEO research
    Returns filtered list of events
    """

    # High-value event types to keep
    HIGH_VALUE_EVENTS = {
        # Session lifecycle
        'session_start',
        'session_end',
        'page_load',
        'page_unload',
        'navigation',
        'tab_switch',

        # User interactions
        'click',
        'input',
        'form_submit',

        # AI platform events
        'ai_query_input',
        'ai_result_click',

        # E-commerce events
        'product_click',
        'conversion_action',

        # Engagement
        'scroll_milestone',  # Note: not continuous scroll
        'visibility_change'
    }

    # Filter events
    filtered = [
        event for event in events
        if event.get('type') in HIGH_VALUE_EVENTS
    ]

    return filtered
