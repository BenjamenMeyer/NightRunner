from typing import List, Optional, Dict, Any
from nightrunner_backend.drivers.base import DatabaseDriver


class ReportsStore:
    def __init__(self, driver: DatabaseDriver):
        self.driver = driver

    async def list_reports(self, event_id: str) -> List[Dict[str, Any]]:
        sql = """
        SELECT id, event_id, report_type, name, status, file_key, content_type, size_bytes, error_message, created_at, completed_at
        FROM compiled_reports
        WHERE event_id = :event_id
        ORDER BY created_at DESC
        """
        rows = await self.driver.execute(sql, {"event_id": event_id})
        return rows or []

    async def get_report(self, report_id: str) -> Optional[Dict[str, Any]]:
        sql = """
        SELECT id, event_id, report_type, name, status, file_key, content_type, size_bytes, error_message, created_at, completed_at
        FROM compiled_reports
        WHERE id = :id
        """
        return await self.driver.fetch_one(sql, {"id": report_id})

    async def create_report_job(self, report_id: str, event_id: str, report_type: str, name: str) -> Dict[str, Any]:
        sql = """
        INSERT INTO compiled_reports (id, event_id, report_type, name, status)
        VALUES (:id, :event_id, :report_type, :name, 'generating')
        """
        await self.driver.execute(sql, {
            "id": report_id,
            "event_id": event_id,
            "report_type": report_type,
            "name": name,
        })
        return await self.get_report(report_id)

    async def mark_report_ready(self, report_id: str, file_key: str, size_bytes: int) -> None:
        sql = """
        UPDATE compiled_reports
        SET status = 'ready', file_key = :file_key, size_bytes = :size_bytes, completed_at = CURRENT_TIMESTAMP
        WHERE id = :id
        """
        await self.driver.execute(sql, {
            "id": report_id,
            "file_key": file_key,
            "size_bytes": size_bytes,
        })

    async def mark_report_failed(self, report_id: str, error_message: str) -> None:
        sql = """
        UPDATE compiled_reports
        SET status = 'failed', error_message = :error_message, completed_at = CURRENT_TIMESTAMP
        WHERE id = :id
        """
        await self.driver.execute(sql, {
            "id": report_id,
            "error_message": error_message,
        })

    async def delete_report(self, report_id: str) -> None:
        sql = "DELETE FROM compiled_reports WHERE id = :id"
        await self.driver.execute(sql, {"id": report_id})
