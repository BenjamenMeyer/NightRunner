import urllib.parse as urlparse
import pytest
import falcon
from falcon import testing
from nightrunner_backend.transport.login import LoginResource


def test_login_redirect():
    app = falcon.asgi.App()
    app.add_route('/auth/login', LoginResource())
    client = testing.TestClient(app)
    resp = client.simulate_get('/auth/login')
    assert resp.status_code == 302
    location = resp.headers['Location']
    parsed = urlparse.urlparse(location)
    query = urlparse.parse_qs(parsed.query)
    # Ensure required OIDC parameters are present
    assert 'client_id' in query
    assert 'response_type' in query
    assert query['response_type'][0] == 'code'
    assert 'redirect_uri' in query
    assert 'state' in query
