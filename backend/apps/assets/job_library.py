"""Explicit library selection becomes an immutable, owner-scoped job reference."""
import hashlib
from pathlib import PurePosixPath

from rest_framework.exceptions import ValidationError

from .models import BrandAsset

MAX_FILE = 10 * 1024 * 1024
MAX_PACKAGE = 20 * 1024 * 1024


def asset_bytes(asset):
    if asset.private_content is not None:
        data = bytes(asset.private_content)
    else:
        try:
            with asset.file.open('rb') as source:
                data = source.read(MAX_FILE + 1)
        except (OSError, ValueError) as exc:
            raise ValidationError('Ficheiro da Biblioteca indisponível. Volte a carregá-lo antes de enviar o pedido.') from exc
    if not data or len(data) > MAX_FILE:
        raise ValidationError('Cada material da Biblioteca deve ter conteúdo e até 10 MB.')
    return data


def selected_library_files(user, ids):
    if not ids:
        return []
    if not user.is_authenticated or user.is_staff:
        raise ValidationError('Selecione materiais na Biblioteca da sua conta de cliente.')
    assets = {asset.pk: asset for asset in BrandAsset.objects.select_for_update().filter(user=user, pk__in=ids)}
    if len(assets) != len(ids):
        raise ValidationError('Um dos materiais selecionados já não está disponível na sua Biblioteca.')
    files, total = [], 0
    for asset_id in ids:
        asset = assets[asset_id]
        content = asset_bytes(asset)
        total += len(content)
        if total > MAX_PACKAGE:
            raise ValidationError('Selecione até 20 MB de materiais da Biblioteca por pedido.')
        filename = PurePosixPath((asset.file_name or asset.file.name).replace('\\', '/')).name[:255]
        files.append({'name': filename, 'size': len(content), 'content': content,
            'library_origin': {'asset_id': asset.pk, 'name': asset.name, 'kind': asset.kind,
                'sha256': hashlib.sha256(content).hexdigest(), 'approval': asset.approval_record}})
    return files


def reference_data(file):
    data = {'id': file.pk, 'name': file.name, 'size': file.size}
    if file.library_origin:
        data['library_origin'] = file.library_origin
    return data
