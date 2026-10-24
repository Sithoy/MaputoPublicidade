import pytest
from rest_framework.test import APIClient


@pytest.mark.django_db
@pytest.mark.parametrize('revision', ['a' * 40, '', 'invalid-value'])
def test_health_exposes_only_a_valid_commit_not_environment_values(monkeypatch, revision):
    monkeypatch.setenv('RENDER_GIT_COMMIT', revision)
    response = APIClient().get('/health/')
    assert response.status_code == 200
    assert response.data == {'status': 'ok', 'db': True}
    assert response['Cache-Control'] == 'no-store'
    assert response.get('X-MP-Release') == ('a' * 40 if revision == 'a' * 40 else None)
