from rest_framework.pagination import PageNumberPagination


class QuotePagination(PageNumberPagination):
    def get_page_size(self, request):
        if request.query_params.get('hq') == '1' and request.query_params.get('page_size') == '10':
            return 10
        return super().get_page_size(request)
