import pytest
import uuid6
from nightrunner_backend.drivers.store.configuration import ConfigurationStore
from nightrunner_backend.models.configuration import ConfigurationGroup, Configuration

@pytest.fixture
async def config_store(test_database):
    return ConfigurationStore(test_database)

@pytest.mark.asyncio
async def test_group_crud_operations(config_store: ConfigurationStore):
    # Create a group
    group = ConfigurationGroup(id=str(uuid6.uuid7()), name="Test Group", description="A group for testing")
    await config_store.create_group(group)

    # Retrieve the group
    fetched = await config_store.get_group(group.id)
    assert fetched is not None
    assert fetched.id == group.id
    assert fetched.name == "Test Group"

    # List groups
    groups = await config_store.list_groups()
    assert any(g.id == group.id for g in groups)

    # Update the group
    group.name = "Updated Name"
    group.description = "Updated description"
    await config_store.update_group(group)
    updated = await config_store.get_group(group.id)
    assert updated.name == "Updated Name"
    assert updated.description == "Updated description"

    # Delete the group
    await config_store.delete_group(group.id)
    deleted = await config_store.get_group(group.id)
    assert deleted is None

    # Getting a non‑existent group returns None
    assert await config_store.get_group("nonexistent") is None

    # Attempt to create duplicate group
    dup_group = ConfigurationGroup(id=group.id, name="Dup", description="")
    # Some databases may raise an exception; if not, ensure the count remains unchanged
    try:
        await config_store.create_group(dup_group)
    except Exception:
        pass
    groups_after = await config_store.list_groups()
    assert len([g for g in groups_after if g.id == group.id]) == 1


@pytest.mark.asyncio
async def test_configuration_crud_operations(config_store: ConfigurationStore):
    # First, create a group to associate configurations with
    group = ConfigurationGroup(id=str(uuid6.uuid7()), name="Config Group", description="")
    await config_store.create_group(group)

    # Create a configuration
    config = Configuration(
        id=str(uuid6.uuid7()),
        group_id=group.id,
        key="test_key",
        value="test_value",
        description="Test config"
    )
    await config_store.create_configuration(config)

    # Retrieve the configuration
    fetched = await config_store.get_configuration(config.id)
    assert fetched is not None
    assert fetched.id == config.id
    assert fetched.key == "test_key"
    assert fetched.value == "test_value"

    # List configurations
    configs = await config_store.list_configurations()
    assert any(c.id == config.id for c in configs)

    # Update the configuration
    config.key = "updated_key"
    config.value = "updated_value"
    await config_store.update_configuration(config)
    updated = await config_store.get_configuration(config.id)
    assert updated.key == "updated_key"
    assert updated.value == "updated_value"

    # Delete the configuration
    await config_store.delete_configuration(config.id)
    assert await config_store.get_configuration(config.id) is None

    # Non‑existent configuration returns None
    assert await config_store.get_configuration("nonexistent") is None

    # Attempt to create duplicate configuration
    dup_config = Configuration(
        id=config.id,
        group_id=group.id,
        key="dup",
        value="dup",
        description=""
    )
    try:
        await config_store.create_configuration(dup_config)
    except Exception:
        pass
    configs_after = await config_store.list_configurations()
    assert len([c for c in configs_after if c.id == config.id]) == 1


@pytest.mark.asyncio
async def test_configuration_without_group(config_store: ConfigurationStore):
    # Create a configuration without a group (group_id is None or empty string)
    config = Configuration(
        id=str(uuid6.uuid7()),
        group_id=None,
        key="standalone_key",
        value="standalone_value",
        description="Standalone config"
    )
    await config_store.create_configuration(config)

    fetched = await config_store.get_configuration(config.id)
    assert fetched is not None
    assert fetched.id == config.id
    assert fetched.group_id is None
    assert fetched.key == "standalone_key"


@pytest.mark.asyncio
async def test_configuration_with_tasks(config_store: ConfigurationStore):
    # Create a configuration containing tasks
    tasks_data = [
        {"name": "Task 1", "type": "Stopwatch", "maxScore": 100},
        {"name": "Task 2", "type": "Timed Challenge", "timeLimit": 300}
    ]
    config = Configuration(
        id=str(uuid6.uuid7()),
        group_id=None,
        key="task_preset_config",
        value="",
        description="Config with tasks",
        tasks=tasks_data
    )
    await config_store.create_configuration(config)

    fetched = await config_store.get_configuration(config.id)
    assert fetched is not None
    assert fetched.tasks == tasks_data
    assert len(fetched.tasks) == 2
    assert fetched.tasks[0]["name"] == "Task 1"


