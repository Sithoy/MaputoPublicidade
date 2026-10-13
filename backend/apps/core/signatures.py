from django.contrib.auth.models import User
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.roles import has_staff_capability

from .models import StaffEmailSignature


def staff_signature(user, required=False):
    from .email_templates import signature
    record = StaffEmailSignature.objects.filter(user=user, approved=True, user__is_active=True).first()
    if not record:
        if required:
            raise ValidationError('Peça ao administrador uma assinatura aprovada antes de enviar emails.')
        return None
    return {**signature(), 'staff_name': record.display_name, 'staff_title': record.title,
            'staff_id': user.pk, 'signature_id': record.pk, 'approved_by': record.approved_by_id,
            'approved_at': record.updated_at.isoformat()}


class SignatureInput(serializers.Serializer):
    user_id = serializers.IntegerField(min_value=1)
    display_name = serializers.CharField(max_length=160)
    title = serializers.CharField(max_length=120)
    approved = serializers.BooleanField()

    def validate(self, values):
        if any('\n' in values[key] or '\r' in values[key] for key in ['display_name', 'title']):
            raise ValidationError('A assinatura deve usar nome e função numa única linha.')
        return values


class StaffSignatures(APIView):
    permission_classes = [IsAuthenticated]

    def allowed(self, request):
        if not has_staff_capability(request.user, 'users.manage'):
            raise PermissionDenied()

    def get(self, request):
        self.allowed(request)
        records = {row.user_id: row for row in StaffEmailSignature.objects.select_related('approved_by')}
        rows = []
        for user in User.objects.filter(is_staff=True, is_active=True).select_related('profile'):
            if not has_staff_capability(user, 'support.manage'):
                continue
            record = records.get(user.pk)
            rows.append({'user_id': user.pk, 'email': user.email,
                         'display_name': record.display_name if record else user.get_full_name(),
                         'title': record.title if record else '', 'approved': bool(record and record.approved),
                         'approved_by': record.approved_by.email if record and record.approved_by else None,
                         'updated_at': record.updated_at if record else None})
        response = Response(rows)
        response['Cache-Control'] = 'private, no-store'
        return response

    def patch(self, request):
        self.allowed(request)
        data = SignatureInput(data=request.data)
        data.is_valid(raise_exception=True)
        values = data.validated_data
        user = User.objects.filter(pk=values.pop('user_id'), is_active=True, is_staff=True).first()
        if not user or not has_staff_capability(user, 'support.manage'):
            raise ValidationError('Colaborador indisponível para envio de emails.')
        StaffEmailSignature.objects.update_or_create(user=user, defaults={**values, 'approved_by': request.user})
        return self.get(request)
