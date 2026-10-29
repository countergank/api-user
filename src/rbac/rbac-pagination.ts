import { PaginatedResponseDTO } from '../common/dto/paginated-response.dto';
import { I18nService } from '../common/i18n/i18n.service';
import { translateRbacItems } from '../common/i18n/rbac-translate.helper';

/**
 * Collection envelope for the RBAC lists (`/roles`, `/permissions`).
 *
 * Both services serve the catalog from the RBAC cache in full, so the slice happens here —
 * after the cache, before the translation — and only the returned page is translated.
 *
 * It lives next to the RBAC controllers rather than in the i18n helper (R2-pagination-in-
 * translate-helper): `rbac-translate.helper.ts` translates, this module paginates.
 */
export async function paginateRbacItems<T extends { name: string; description: string }>(
  items: T[],
  pagination: { page?: number; limit?: number },
  i18n: I18nService,
  lang?: string,
): Promise<PaginatedResponseDTO<T>> {
  const page = pagination.page ?? 1;
  const limit = pagination.limit ?? 20;
  const start = (page - 1) * limit;
  const data = await translateRbacItems(items.slice(start, start + limit), i18n, lang);

  return PaginatedResponseDTO.of(data, items.length, page, limit);
}
