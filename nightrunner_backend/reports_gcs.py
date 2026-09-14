import os
import logging
from typing import Optional
from nightrunner_backend.config.settings import settings

logger = logging.getLogger(__name__)

# Local in-memory / disk storage fallback when GCS bucket is not configured or in local dev mode
_LOCAL_STORAGE: dict[str, bytes] = {}


def upload_report_bytes(file_key: str, data: bytes, content_type: str = "application/pdf") -> None:
    """
    Uploads compiled report bytes to GCS if configured, or in-memory fallback.
    """
    bucket_name = settings.gcs_reports_bucket
    if bucket_name:
        try:
            from google.cloud import storage
            client = storage.Client()
            bucket = client.bucket(bucket_name)
            blob = bucket.blob(file_key)
            blob.upload_from_string(data, content_type=content_type)
            logger.info(f"Uploaded report {file_key} to GCS bucket {bucket_name}")
            return
        except Exception as e:
            logger.warning(f"Failed uploading to GCS bucket {bucket_name}, storing locally: {e}")

    _LOCAL_STORAGE[file_key] = data


def download_report_bytes(file_key: str) -> Optional[bytes]:
    """
    Downloads compiled report bytes from GCS or in-memory storage.
    """
    bucket_name = settings.gcs_reports_bucket
    if bucket_name:
        try:
            from google.cloud import storage
            client = storage.Client()
            bucket = client.bucket(bucket_name)
            blob = bucket.blob(file_key)
            if blob.exists():
                return blob.download_as_bytes()
        except Exception as e:
            logger.warning(f"Failed downloading from GCS bucket {bucket_name}, checking local storage: {e}")

    return _LOCAL_STORAGE.get(file_key)


def delete_report_bytes(file_key: str) -> None:
    """
    Deletes compiled report object from GCS or in-memory storage.
    """
    bucket_name = settings.gcs_reports_bucket
    if bucket_name:
        try:
            from google.cloud import storage
            client = storage.Client()
            bucket = client.bucket(bucket_name)
            blob = bucket.blob(file_key)
            if blob.exists():
                blob.delete()
        except Exception as e:
            logger.warning(f"Failed deleting object from GCS bucket {bucket_name}: {e}")

    _LOCAL_STORAGE.pop(file_key, None)
