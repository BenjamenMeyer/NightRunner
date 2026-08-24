import pytest
import uuid6
from nightrunner_backend.drivers.base import DatabaseDriver
from nightrunner_backend.drivers.store.patrols import PatrolsStore
from nightrunner_backend.models.patrol import Patrol, PatrolMember

@pytest.fixture
async def db():
    driver = DatabaseDriver("sqlite:///:memory:")
    await driver.run_migrations()
    yield driver
    await driver.close()

@pytest.mark.asyncio
async def test_create_and_get_patrol(db):
    store = PatrolsStore(db)
    patrol = Patrol(
        id=str(uuid6.uuid7()),
        name="Trail Life",
        members=[
            PatrolMember(id=str(uuid6.uuid7()), name="Alice", rank="Patrol Leader", troop="GA-0594"),
            PatrolMember(id=str(uuid6.uuid7()), name="Bob", rank="Member", troop="GA-0594")
        ]
    )
    
    await store.create(patrol)
    
    fetched = await store.get(patrol.id)
    assert fetched is not None
    assert fetched.name == patrol.name
    assert len(fetched.members) == 2
    member_names = [m.name for m in fetched.members]
    assert "Alice" in member_names
    assert "Bob" in member_names

@pytest.mark.asyncio
async def test_list_patrols(db):
    store = PatrolsStore(db)
    patrol1 = Patrol(id=str(uuid6.uuid7()), name="Patrol 1")
    patrol2 = Patrol(id=str(uuid6.uuid7()), name="Patrol 2")
    
    await store.create(patrol1)
    await store.create(patrol2)
    
    patrols = await store.list()
    assert len(patrols) == 2
    names = [p.name for p in patrols]
    assert "Patrol 1" in names
    assert "Patrol 2" in names

@pytest.mark.asyncio
async def test_update_patrol(db):
    store = PatrolsStore(db)
    patrol = Patrol(id=str(uuid6.uuid7()), name="Original Name")
    await store.create(patrol)
    
    patrol.name = "Updated Name"
    patrol.members = [PatrolMember(id=str(uuid6.uuid7()), name="Charlie")]
    await store.update(patrol)
    
    fetched = await store.get(patrol.id)
    assert fetched.name == "Updated Name"
    assert len(fetched.members) == 1
    assert fetched.members[0].name == "Charlie"

@pytest.mark.asyncio
async def test_delete_patrol(db):
    store = PatrolsStore(db)
    patrol = Patrol(id=str(uuid6.uuid7()), name="To Be Deleted")
    await store.create(patrol)
    
    await store.delete(patrol.id)
    
    fetched = await store.get(patrol.id)
    assert fetched is None
