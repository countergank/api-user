import { I18nService } from './i18n.service';

/**
 * Translates the `description` field of roles/permissions using `name` as the translation key.
 * Example: name="user:create" → key="rbac.permissions.user:create"
 */
export async function translateRbacItems<T extends { name: string; description: string }>(
  items: T[],
  i18n: I18nService,
): Promise<T[]> {
  const lang = i18n.getLanguage();
  return Promise.all(
    items.map(async (item) => ({
      ...item,
      description:
        (await i18n.translate(`rbac.${item.name}`, lang)) || item.description,
    })),
  );
}
