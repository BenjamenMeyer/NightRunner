import os
import pytest
import subprocess
import time
import urllib.request
import falcon
import falcon.testing
from google.cloud import storage
from google.auth.credentials import AnonymousCredentials
from nightrunner_backend.config.settings import settings
from nightrunner_backend.main import app, register_routes
from nightrunner_backend import reports_gcs

CONTAINER_NAME = "nightrunner-fake-gcs-test"
EMULATOR_PORT = 4443
EMULATOR_HOST = f"http://localhost:{EMULATOR_PORT}"
TEST_BUCKET_NAME = "test-nightrunner-reports"


@pytest.fixture(scope="module")
def fake_gcs_emulator():
    """Spawns fsouza/fake-gcs-server container via podman/docker if not already running."""
    # Check if container tool (podman or docker) is available
    tool = None
    for cmd in ["podman", "docker"]:
        try:
            res = subprocess.run([cmd, "--version"], capture_output=True, text=True)
            if res.returncode == 0:
                tool = cmd
                break
        except FileNotFoundError:
            continue

    if not tool:
        pytest.skip("Neither podman nor docker available for fake-gcs integration test.")

    # Remove any stale container with same name
    subprocess.run([tool, "rm", "-f", CONTAINER_NAME], capture_output=True)

    # Start fake-gcs-server container
    run_cmd = [
        tool,
        "run",
        "-d",
        "--name",
        CONTAINER_NAME,
        "-p",
        f"{EMULATOR_PORT}:{EMULATOR_PORT}",
        "docker.io/fsouza/fake-gcs-server:latest",
        "-scheme",
        "http",
        "-external-url",
        EMULATOR_HOST,
    ]
    proc = subprocess.run(run_cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        pytest.skip(f"Failed to launch fake-gcs container: {proc.stderr}")

    # Wait for emulator to respond
    ready = False
    for _ in range(30):
        try:
            with urllib.request.urlopen(f"{EMULATOR_HOST}/storage/v1/b") as response:
                if response.status == 200:
                    ready = True
                    break
        except Exception:
            time.sleep(0.5)

    if not ready:
        subprocess.run([tool, "rm", "-f", CONTAINER_NAME], capture_output=True)
        pytest.skip("fake-gcs-server container did not become ready in time.")

    # Set up environment variables and create test bucket
    os.environ["STORAGE_EMULATOR_HOST"] = EMULATOR_HOST
    client = storage.Client(credentials=AnonymousCredentials(), project="test-project")
    client.create_bucket(TEST_BUCKET_NAME)

    yield EMULATOR_HOST

    # Teardown
    os.environ.pop("STORAGE_EMULATOR_HOST", None)
    subprocess.run([tool, "rm", "-f", CONTAINER_NAME], capture_output=True)


@pytest.fixture
async def test_client():
    register_routes(app)
    async with falcon.testing.ASGITestClient(app) as client:
        yield client


@pytest.mark.asyncio
async def test_gcs_emulator_integration(fake_gcs_emulator, monkeypatch, test_client, token_factory):
    """
    Full end-to-end integration test of GCS private storage workflow against fake-gcs-server.
    """
    # 1. Configure settings to point to fake-gcs bucket
    monkeypatch.setattr(settings, "gcs_reports_bucket", TEST_BUCKET_NAME)

    headers = token_factory(is_admin=True)

    # 2. Test direct upload, download, delete via reports_gcs helper module
    test_key = "events/evt-emulator-1/patrols-pdf_20260914_010000.pdf"
    test_data = b"%PDF-1.4 Fake GCS Report Data Stream %EOF"

    # Upload to fake-gcs bucket
    reports_gcs.upload_report_bytes(test_key, test_data)

    # Download back from fake-gcs bucket
    downloaded = reports_gcs.download_report_bytes(test_key)
    assert downloaded == test_data

    # Verify object exists in fake-gcs bucket via google-cloud-storage client
    client = storage.Client(credentials=AnonymousCredentials(), project="test-project")
    bucket = client.bucket(TEST_BUCKET_NAME)
    blob = bucket.blob(test_key)
    assert blob.exists() is True

    # Delete from fake-gcs bucket
    reports_gcs.delete_report_bytes(test_key)
    assert blob.exists() is False

    # 3. Test HTTP Transport endpoints against fake-gcs bucket
    post_resp = await test_client.simulate_post(
        "/v1/events/evt-emulator-1/compiled-reports",
        json={"reportType": "patrols-pdf"},
        headers=headers,
    )
    assert post_resp.status == falcon.HTTP_202
    report_id = post_resp.json["id"]

    # Give async generator brief moment to complete upload
    import asyncio
    await asyncio.sleep(0.5)

    # Download generated report via transport API
    get_resp = await test_client.simulate_get(
        f"/v1/compiled-reports/{report_id}",
        headers=headers,
    )
    assert get_resp.status == falcon.HTTP_200
    assert get_resp.headers["content-type"] == "application/pdf"
    assert len(get_resp.content) > 0

    # Clean up report via transport API
    del_resp = await test_client.simulate_delete(
        f"/v1/compiled-reports/{report_id}",
        headers=headers,
    )
    assert del_resp.status == falcon.HTTP_204
