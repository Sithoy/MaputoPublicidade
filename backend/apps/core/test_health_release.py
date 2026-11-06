import pytest
from rest_framework.test import APIClient


@pytest.mark.django_db
@pytest.mark.parametrize('revision', ['a' * 40, '', 'invalid-value'])
def test_health_exposes_only_a_valid_commit_not_environment_values(monkeypatch, revision):
    monkeypatch.delenv('MP_RELEASE_SHA', raising=False)
    monkeypatch.setenv('RENDER_GIT_COMMIT', revision)
    response = APIClient().get('/health/')
    assert response.status_code == 200
    assert response.data == {'status': 'ok', 'db': True}
    assert response['Cache-Control'] == 'no-store'
    assert response.get('X-MP-Release') == ('a' * 40 if revision == 'a' * 40 else None)


@pytest.mark.django_db
@pytest.mark.parametrize('revision', ['b' * 40, 'invalid-value'])
def test_cloud_run_release_has_precedence_without_exposing_invalid_values(monkeypatch, revision):
    monkeypatch.setenv('MP_RELEASE_SHA', revision)
    monkeypatch.setenv('RENDER_GIT_COMMIT', 'a' * 40)
    response = APIClient().get('/health/')
    assert response.status_code == 200
    assert response.get('X-MP-Release') == ('b' * 40 if revision == 'b' * 40 else None)
