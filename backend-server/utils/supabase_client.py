"""
Supabase client utilities
Provides helper functions for interacting with Supabase features
"""

import os
from typing import Optional
from supabase import create_client, Client


class SupabaseManager:
    """Manager for Supabase-specific operations"""

    def __init__(self):
        self.url: Optional[str] = os.getenv('SUPABASE_URL')
        self.key: Optional[str] = os.getenv('SUPABASE_SERVICE_KEY') or os.getenv('SUPABASE_ANON_KEY')
        self.client: Optional[Client] = None

        if self.url and self.key:
            self.client = create_client(self.url, self.key)

    def is_configured(self) -> bool:
        """Check if Supabase is configured"""
        return self.client is not None

    def upload_session_file(self, bucket_name: str, file_path: str, file_data: bytes) -> dict:
        """
        Upload a file to Supabase Storage

        Args:
            bucket_name: Name of the storage bucket
            file_path: Path within bucket (e.g., 'P001/session_123/upload_1.json.gz')
            file_data: File contents as bytes

        Returns:
            dict with upload result
        """
        if not self.client:
            raise ValueError("Supabase not configured")

        try:
            result = self.client.storage.from_(bucket_name).upload(
                path=file_path,
                file=file_data,
                file_options={"content-type": "application/gzip"}
            )
            return {"success": True, "path": file_path}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def download_session_file(self, bucket_name: str, file_path: str) -> bytes:
        """
        Download a file from Supabase Storage

        Args:
            bucket_name: Name of the storage bucket
            file_path: Path within bucket

        Returns:
            File contents as bytes
        """
        if not self.client:
            raise ValueError("Supabase not configured")

        result = self.client.storage.from_(bucket_name).download(file_path)
        return result

    def get_public_url(self, bucket_name: str, file_path: str) -> str:
        """
        Get public URL for a file

        Args:
            bucket_name: Name of the storage bucket
            file_path: Path within bucket

        Returns:
            Public URL string
        """
        if not self.client:
            raise ValueError("Supabase not configured")

        result = self.client.storage.from_(bucket_name).get_public_url(file_path)
        return result

    def create_bucket(self, bucket_name: str, public: bool = False) -> dict:
        """
        Create a new storage bucket

        Args:
            bucket_name: Name for the new bucket
            public: Whether bucket should be public

        Returns:
            dict with creation result
        """
        if not self.client:
            raise ValueError("Supabase not configured")

        try:
            result = self.client.storage.create_bucket(
                bucket_name,
                options={"public": public}
            )
            return {"success": True, "bucket": bucket_name}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def list_buckets(self) -> list:
        """
        List all storage buckets

        Returns:
            List of bucket information
        """
        if not self.client:
            raise ValueError("Supabase not configured")

        return self.client.storage.list_buckets()

    def execute_query(self, query: str, params: dict = None):
        """
        Execute a raw SQL query

        Args:
            query: SQL query string
            params: Query parameters

        Returns:
            Query results
        """
        if not self.client:
            raise ValueError("Supabase not configured")

        # Note: For raw SQL, use the database connection directly
        # This is handled by SQLAlchemy in our case
        pass


# Create singleton instance
supabase_manager = SupabaseManager()


def get_supabase_manager() -> SupabaseManager:
    """Get the Supabase manager instance"""
    return supabase_manager


def is_using_supabase() -> bool:
    """Check if the application is configured to use Supabase"""
    database_url = os.getenv('DATABASE_URL', '')
    return 'supabase.co' in database_url or os.getenv('SUPABASE_URL') is not None
