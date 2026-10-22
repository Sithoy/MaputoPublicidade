import pytest

from apps.quotes.models import QuoteRequest


@pytest.mark.django_db
def test_reception_inbox_has_ten_tasks_per_page_without_changing_other_lists(staff_client):
    for index in range(23):
        QuoteRequest.objects.create(client_name=f'Empresa {index:02d}', client_phone='841234567')
    pages = [staff_client.get('/api/quotes/', {'hq': '1', 'page_size': '10', 'page': page}) for page in (1, 2, 3)]
    assert all(page.status_code == 200 for page in pages)
    assert [len(page.data['results']) for page in pages] == [10, 10, 3]
    assert all(page.data['count'] == 23 for page in pages)
    references = [row['reference'] for page in pages for row in page.data['results']]
    assert len(set(references)) == 23
    assert pages[0].data['previous'] is None
    assert pages[0].data['next'] is not None
    assert pages[-1].data['next'] is None
    assert len(staff_client.get('/api/quotes/').data['results']) == 23
    assert len(staff_client.get('/api/quotes/', {'hq': '1'}).data['results']) == 23
