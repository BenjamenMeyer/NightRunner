"""Per-troop results report (assessment 2.8, #258)."""
import asyncio

import falcon
import falcon.testing
import pytest

from nightrunner_backend.main import app, register_routes
from nightrunner_backend.models.patrol import Patrol, PatrolMember
from nightrunner_backend.models.roster import EventAttendee, Troop
from nightrunner_backend.models.score import Score
from nightrunner_backend.models.station import Station
from nightrunner_backend.reports_troop_results_pdf import generate_troop_results_pdf
from nightrunner_backend.troop_results import (
    NO_TROOP_KEY,
    build_troop_results,
    format_duration,
    format_entry,
)

TASKS = [
    {"id": "t-time", "name": "Time", "type": "Stopwatch"},
    {"id": "t-pass", "name": "Fire lit", "type": "Pass / Fail"},
    {"id": "t-answer", "name": "Cipher", "type": "Secret Cipher / Decoding", "expectedAnswer": "SECRET"},
]


def _station(sid="st-1", weight=1.0, explanation="Your time is subtracted from 30 minutes."):
    return Station(id=sid, event_id="evt", name=f"Station {sid}", station_weight=weight,
                   scoring_explanation=explanation, tasks=[dict(t) for t in TASKS])


def _patrol(pid, number, troops):
    members = [PatrolMember(id=f"{pid}-m{i}", name=f"Scout {pid}{i}", troop=t) for i, t in enumerate(troops)]
    return Patrol(id=pid, event_id="evt", name=f"Patrol {pid}", number=number, members=members,
                  phone_number="555-0100", radio_channel="7")


def _finalized(station_scores, finals):
    rows = [{"patrolId": pid, "stationId": sid, "scoreType": "station", "scoreValue": v, "scoringMode": "relative"}
            for (pid, sid), v in station_scores.items()]
    rows += [{"patrolId": pid, "stationId": None, "scoreType": "final", "scoreValue": v, "scoringMode": "overall"}
             for pid, v in finals.items()]
    return rows


def _score(pid, task, value, text=None, active=True, at="2026-09-25T20:00:00"):
    return Score(event_id="evt", station_id="st-1", patrol_id=pid, task_id=task,
                 score_value=value, submitted_text=text, active=active, submitted_at=at)


def test_format_entry_matches_review_screen():
    assert format_duration(247) == "4:07"
    assert format_duration(9718) == "2:41:58"
    assert format_entry(TASKS[0], _score("p", "t-time", 247))["text"] == "4:07"
    assert format_entry(TASKS[1], _score("p", "t-pass", 0))["text"] == "Fail"
    assert format_entry(TASKS[2], _score("p", "t-answer", 0, text="SECRT"))["text"] == "SECRT"
    assert format_entry({"type": "Score Challenge"}, _score("p", "x", 12.0))["text"] == "12"


def test_mixed_troop_patrol_goes_to_every_troop():
    patrols = [_patrol("a", 1, ["GA-0594", "GA-0100"]), _patrol("b", 2, ["GA-0594"]), _patrol("c", 3, [None])]
    groups = build_troop_results(
        patrols, [_station()],
        _finalized({("a", "st-1"): 10, ("b", "st-1"): 5, ("c", "st-1"): 0}, {"a": 10, "b": 5, "c": 0}),
        [], {}, [],
    )
    by_key = {g["troopKey"]: [p["patrolId"] for p in g["patrols"]] for g in groups}
    assert by_key == {"GA-0100": ["a"], "GA-0594": ["a", "b"], NO_TROOP_KEY: ["c"]}
    assert groups[-1]["troopKey"] == NO_TROOP_KEY


def test_roster_link_beats_typed_troop_text():
    troop = Troop(id="troop-1", number="GA-0594", name="Pine Hill")
    patrol = _patrol("a", 1, ["typo 99"])
    patrol.members[0].attendee_id = "att-1"
    groups = build_troop_results([patrol], [_station()], _finalized({}, {"a": 0}), [],
                                 {"att-1": "troop-1"}, [troop])
    assert groups[0]["troopId"] == "troop-1"
    assert groups[0]["troopLabel"] == "Troop GA-0594 — Pine Hill"


def test_ranks_average_and_entries():
    patrols = [_patrol("a", 1, ["GA-0594"]), _patrol("b", 2, ["GA-0594"]), _patrol("c", 3, ["GA-0594"])]
    scores = [
        _score("a", "t-time", 300, active=False, at="2026-09-25T19:00:00"),  # superseded
        _score("a", "t-time", 247),
        _score("a", "t-pass", 1),
        _score("b", "t-time", 400),
        # patrol c skipped the station: no rows
    ]
    groups = build_troop_results(
        patrols, [_station()],
        _finalized({("a", "st-1"): 10, ("b", "st-1"): 6, ("c", "st-1"): 0}, {"a": 10, "b": 6, "c": 0}),
        scores, {}, [],
    )
    pages = {p["patrolId"]: p for p in groups[0]["patrols"]}
    a_station = pages["a"]["stations"][0]
    assert pages["a"]["overallRankStr"] == "1st"
    assert pages["a"]["patrolCount"] == 3
    assert a_station["rankStr"] == "1st"
    assert a_station["average"] == 8.0  # c skipped, so it is left out of the average
    assert a_station["best"] == 10
    assert [e["text"] for e in a_station["entries"]] == ["4:07", "Pass"]
    assert a_station["explanation"].startswith("Your time")
    assert pages["c"]["stations"][0]["attempted"] is False


def test_pdf_renders_and_leaves_out_contact_fields():
    patrols = [_patrol("a", 1, ["GA-0594"])]
    groups = build_troop_results(patrols, [_station(weight=2.0, explanation="Fast & <careful> wins.")],
                                 _finalized({("a", "st-1"): 10}, {"a": 20}),
                                 [_score("a", "t-time", 247)], {}, [])
    assert "phone" not in str(groups).lower()
    pdf = generate_troop_results_pdf("Night Ops 2026", groups[0], scoring_mode="relative")
    assert pdf.startswith(b"%PDF") and len(pdf) > 1000


@pytest.fixture
async def test_client():
    register_routes(app)
    async with falcon.testing.ASGITestClient(app) as client:
        yield client


async def _seed(driver):
    from nightrunner_backend.drivers.store.events import EventsStore
    from nightrunner_backend.drivers.store.patrols import PatrolsStore
    from nightrunner_backend.drivers.store.roster import RosterStore
    from nightrunner_backend.drivers.store.scores import ScoresStore
    from nightrunner_backend.drivers.store.stations import StationsStore
    from nightrunner_backend.models.event import Event

    await EventsStore(driver).create(Event(id="evt", name="Night Ops"))
    await StationsStore(driver).create(_station())
    roster = RosterStore(driver)
    troop = await roster.ensure_troop("GA-0594", "Pine Hill")
    await roster.create_attendee(EventAttendee(id="att-1", event_id="evt", troop_id=troop.id,
                                               first_name="Sam", last_name="Scout", source_key="k1"))
    a = _patrol("a", 1, [None, "GA-0100"])
    a.members[0].attendee_id = "att-1"
    patrols = PatrolsStore(driver)
    await patrols.create(a)
    await patrols.create(_patrol("b", 2, ["GA-0594"]))
    scores = ScoresStore(driver)
    await scores.create(_score("a", "t-time", 247))
    await scores.create(_score("b", "t-time", 400))
    await scores.save_finalized_results("evt", _finalized(
        {("a", "st-1"): 10, ("b", "st-1"): 6}, {"a": 10, "b": 6}))
    return troop


@pytest.mark.asyncio
async def test_troop_results_refused_before_finalizing(test_client, token_factory):
    resp = await test_client.simulate_post("/v1/events/evt-none/compiled-reports",
                                           json={"reportType": "troop-results"}, headers=token_factory())
    assert resp.status == falcon.HTTP_409


@pytest.mark.asyncio
async def test_troop_results_one_ready_pdf_per_troop(test_client, token_factory, test_database):
    troop = await _seed(test_database)
    headers = token_factory()

    resp = await test_client.simulate_post("/v1/events/evt/compiled-reports",
                                           json={"reportType": "troop-results"}, headers=headers)
    assert resp.status == falcon.HTTP_202
    jobs = resp.json["reports"]
    assert sorted(j["name"] for j in jobs) == [
        "Troop Results — Troop GA-0100 (Night Ops)",
        "Troop Results — Troop GA-0594 — Pine Hill (Night Ops)",
    ]

    single = await test_client.simulate_post("/v1/events/evt/compiled-reports",
                                             json={"reportType": "troop-results", "troopId": troop.id},
                                             headers=headers)
    assert single.status == falcon.HTTP_202
    assert len(single.json["reports"]) == 1

    await asyncio.sleep(1.5)
    listed = await test_client.simulate_get("/v1/events/evt/compiled-reports", headers=headers)
    by_id = {r["id"]: r for r in listed.json["reports"]}
    for job in jobs + single.json["reports"]:
        report = by_id[job["id"]]
        assert report["status"] == "ready", report.get("error_message")
        assert report["size_bytes"] > 0


@pytest.mark.asyncio
async def test_station_scoring_explanation_round_trips(test_client, token_factory, test_database):
    from nightrunner_backend.drivers.store.events import EventsStore
    from nightrunner_backend.models.event import Event
    await EventsStore(test_database).create(Event(id="evt", name="Night Ops"))
    headers = token_factory()

    created = await test_client.simulate_post("/v1/stations", headers=headers, json={
        "eventId": "evt", "name": "Fire", "scoringExplanation": "Faster is better."})
    assert created.status == falcon.HTTP_201
    sid = created.json["id"]

    await test_client.simulate_put(f"/v1/stations/{sid}", headers=headers,
                                   json={"scoringExplanation": "Time taken from 30 minutes."})
    got = await test_client.simulate_get(f"/v1/stations/{sid}", headers=headers)
    assert got.json["scoringExplanation"] == "Time taken from 30 minutes."
