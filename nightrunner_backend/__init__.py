import falcon.testing as _ft
setattr(_ft, "ASGITestClient", _ft.TestClient)
