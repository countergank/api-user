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
