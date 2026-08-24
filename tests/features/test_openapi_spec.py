import yaml
import pathlib
import pytest
from nightrunner_backend.main import app

# Helper to extract routes from Falcon app (asgi)
def get_registered_paths():
    # Falcon stores routes in app._router._static_routes and _dynamic_routes
    routes = []
    if hasattr(app, '_router'):
        router = getattr(app, '_router')
        for route in getattr(router, '_static_routes', []):
            routes.append(route[0])
        for route in getattr(router, '_dynamic_routes', []):
            routes.append(route[0])
    return set(routes)

def test_openapi_paths_match_implementation():
    openapi_path = pathlib.Path(__file__).parents[2] / 'api' / 'openapi.yaml'
    with openapi_path.open() as f:
        spec = yaml.safe_load(f)
    spec_paths = set(spec.get('paths', {}).keys())
    impl_paths = get_registered_paths()
    # Ensure that every implementation path is documented in the spec
    missing = impl_paths - spec_paths
    assert not missing, f"Implementation routes missing from OpenAPI spec: {missing}"
    # Ensure that key new report endpoints are present
    expected = {"/v1/reports/stations/{stationId}", "/v1/reports/events/{eventId}"}
    for p in expected:
        assert p in spec_paths, f"Expected OpenAPI path {p} not found"
