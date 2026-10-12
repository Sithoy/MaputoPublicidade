"""Test client that models the receptionist UI's explicit edit-session handshake."""
import re

from rest_framework.test import APIClient


class ReceptionEditorClient(APIClient):
    def reserve_quote(self, path, payload=None):
        match = re.match(r"^/api/quotes/([^/]+)/", path)
        if not match or (path.endswith("proposal-workflow/") and (payload or {}).get("action") in {"approve", "return"}):
            return
        response = super().post(f"/api/reception/{match[1]}/edit-session/", {"action": "acquire"}, format="json")
        if response.status_code == 200:
            self.credentials(HTTP_X_RECEPTION_EDIT_TOKEN=response.data["token"])

    def post(self, path, data=None, **kwargs):
        self.reserve_quote(path, data)
        response = super().post(path, data, **kwargs)
        if response.status_code == 200 and isinstance(response.data, dict):
            token = response.data.get("edit_token") or response.data.get("token")
            if token:
                self.credentials(HTTP_X_RECEPTION_EDIT_TOKEN=token)
        return response

    def patch(self, path, data=None, **kwargs):
        self.reserve_quote(path, data)
        return super().patch(path, data, **kwargs)
