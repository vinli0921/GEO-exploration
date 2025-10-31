"""
Data compression utilities
"""

import gzip
import json


def compress_data(data, method='gzip'):
    """
    Compress data using specified method

    Args:
        data: Data to compress (dict or string)
        method: Compression method ('gzip', 'zstd')

    Returns:
        Compressed bytes
    """

    if isinstance(data, dict):
        data = json.dumps(data)

    if isinstance(data, str):
        data = data.encode('utf-8')

    if method == 'gzip':
        return gzip.compress(data)
    else:
        raise ValueError(f'Unsupported compression method: {method}')


def decompress_data(compressed_data, method='gzip', return_json=True):
    """
    Decompress data

    Args:
        compressed_data: Compressed bytes
        method: Compression method ('gzip', 'zstd')
        return_json: If True, parse as JSON and return dict

    Returns:
        Decompressed data (string or dict)
    """

    if method == 'gzip':
        decompressed = gzip.decompress(compressed_data).decode('utf-8')
    else:
        raise ValueError(f'Unsupported compression method: {method}')

    if return_json:
        return json.loads(decompressed)

    return decompressed
