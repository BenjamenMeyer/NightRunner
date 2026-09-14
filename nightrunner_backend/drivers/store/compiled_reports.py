from typing import List, Optional, Dict, Any
from nightrunner_backend.drivers.base import DatabaseDriver


class ReportsStore:
    def __init__(self, driver: DatabaseDriver):
        self.driver = driver

    def _format_row(self, row: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if not row:
            return None
        formatted = dict(row)
        for key in ("created_at", "completed_at"):
            val = formatted.get(key)
            if hasattr(val, "isoformat"):
                formatted[key] = val.isoformat()
            elif val is not None:
                formatted[key] = str(val)
        return formatted

    async def list_reports(self, event_id: str) -> List[Dict[str, Any]]:
        sql = """
        SELECT id, event_id, report_type, name, status, file_key, content_type, size_bytes, error_message, created_at, completed_at
        FROM compiled_reports
        WHERE event_id = :event_id
        ORDER BY created_at DESC, id DESC
        """
        rows = await self.driver.execute(sql, {"event_id": event_id})
        return [self._format_row(r) for r in (rows or [])]

    async def get_report(self, report_id: str) -> Optional[Dict[str, Any]]:
        sql = """
        SELECT id, event_id, report_type, name, status, file_key, content_type, size_bytes, error_message, created_at, completed_at
        FROM compiled_reports
        WHERE id = :id
        """
        row = await self.driver.fetch_one(sql, {"id": report_id})
        return self._format_row(row)

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
