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
