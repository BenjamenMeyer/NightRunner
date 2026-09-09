from typing import List, Optional
from nightrunner_backend.drivers.base import DatabaseDriver
from nightrunner_backend.models.configuration import ConfigurationGroup, Configuration

# SQL statements for ConfigurationGroup
LIST_GROUPS = "SELECT id, name, description FROM configuration_groups"
GET_GROUP = "SELECT id, name, description FROM configuration_groups WHERE id = :id"
CREATE_GROUP = """
    INSERT INTO configuration_groups (id, name, description)
    VALUES (:id, :name, :description)
"""
UPDATE_GROUP = """
    UPDATE configuration_groups
    SET name = :name, description = :description
    WHERE id = :id
"""
DELETE_GROUP = "DELETE FROM configuration_groups WHERE id = :id"

# SQL statements for Configuration
LIST_CONFIGS = "SELECT id, group_id, key, value, description FROM configurations"
GET_CONFIG = "SELECT id, group_id, key, value, description FROM configurations WHERE id = :id"
CREATE_CONFIG = """
    INSERT INTO configurations (id, group_id, key, value, description)
    VALUES (:id, :group_id, :key, :value, :description)
"""
UPDATE_CONFIG = """
    UPDATE configurations
    SET group_id = :group_id, key = :key, value = :value, description = :description
    WHERE id = :id
"""
DELETE_CONFIG = "DELETE FROM configurations WHERE id = :id"

class ConfigurationStore:
    def __init__(self, driver: DatabaseDriver):
        self.driver = driver

    # ConfigurationGroup methods
    async def list_groups(self) -> List[ConfigurationGroup]:
        rows = await self.driver.execute(LIST_GROUPS)
        return [ConfigurationGroup(**row) for row in rows]

    async def get_group(self, group_id: str) -> Optional[ConfigurationGroup]:
        row = await self.driver.fetch_one(GET_GROUP, {"id": group_id})
        return ConfigurationGroup(**row) if row else None

    async def create_group(self, group: ConfigurationGroup) -> None:
        await self.driver.execute(CREATE_GROUP, {
            "id": group.id,
            "name": group.name,
            "description": group.description,
        })

    async def update_group(self, group: ConfigurationGroup) -> None:
        await self.driver.execute(UPDATE_GROUP, {
            "id": group.id,
            "name": group.name,
            "description": group.description,
        })

    async def delete_group(self, group_id: str) -> None:
        await self.driver.execute(DELETE_GROUP, {"id": group_id})

    # Configuration methods
    async def list_configurations(self) -> List[Configuration]:
        rows = await self.driver.execute(LIST_CONFIGS)
        return [Configuration(**row) for row in rows]

    async def get_configuration(self, config_id: str) -> Optional[Configuration]:
        row = await self.driver.fetch_one(GET_CONFIG, {"id": config_id})
        return Configuration(**row) if row else None

    async def create_configuration(self, config: Configuration) -> None:
        await self.driver.execute(CREATE_CONFIG, {
            "id": config.id,
            "group_id": config.group_id if config.group_id else None,
            "key": config.key,
            "value": config.value,
            "description": config.description,
        })

    async def update_configuration(self, config: Configuration) -> None:
        await self.driver.execute(UPDATE_CONFIG, {
            "id": config.id,
            "group_id": config.group_id if config.group_id else None,
            "key": config.key,
            "value": config.value,
            "description": config.description,
        })

    async def delete_configuration(self, config_id: str) -> None:
        await self.driver.execute(DELETE_CONFIG, {"id": config_id})
