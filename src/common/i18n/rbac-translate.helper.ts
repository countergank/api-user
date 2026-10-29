import { PaginatedResponseDTO } from '../dto/paginated-response.dto';
import { I18nService } from './i18n.service';

/**
 * Translates the `description` field of roles/permissions using `name` as the translation key.
 * Example: name="user:create" → key="rbac.permissions.user:create"
 */
export async function translateRbacItems<T extends { name: string; description: string }>(
  items: T[],
  i18n: I18nService,
  lang?: string,
): Promise<T[]> {
  const language = lang || i18n.getLanguage();
  return Promise.all(
    items.map(async (item) => {
      const plain = 'toJSON' in item ? (item as any).toJSON() : item;
      const translated = await i18n.translate(`rbac.${item.name}`, language);
      return {
        ...plain,
        description: translated !== `rbac.${item.name}` ? translated : item.description,
      };
    }),
  );
}

/**
 * Collection envelope for the RBAC lists (COU-260, R2-dup-pagination).
 *
 * Both `/roles` and `/permissions` page over the catalog the service caches in full, so
 * the slice happens here, after the cache and before the translation: only the returned
 * page is translated. Keeping it in one helper is why neither controller does page math.
 */
export async function paginateRbacItems<T extends { name: string; description: string }>(
  items: T[],
  page: number,
  limit: number,
  i18n: I18nService,
  lang?: string,
): Promise<PaginatedResponseDTO<T>> {
  const start = (page - 1) * limit;
  const data = await translateRbacItems(items.slice(start, start + limit), i18n, lang);
  return PaginatedResponseDTO.of(data, items.length, page, limit);
}
