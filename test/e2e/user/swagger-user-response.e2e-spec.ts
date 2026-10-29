import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { createTestApp } from '../../helpers/create-test-app';

/**
 * Minimal shape of a generated schema node. `SchemaObject` is not exported by
 * `@nestjs/swagger` (it lives in the openapi-spec interfaces), so the spec keeps
 * a local alias instead of reaching into internal paths.
 */
type SchemaLike = {
  description?: string;
  format?: string;
  nullable?: boolean;
  properties?: Record<string, SchemaLike>;
};

/**
 * COU-319: the UserResponse schema in Swagger must derive its metadata from
 * AdminUserDTO (single source of truth), so a description change in the DTO
 * reaches Swagger without editing src/user/api-docs/examples/user.examples.ts.
 * COU-346: UserResponse now derives from AdminUserDTO — the lock-state fields
 * live there, not on the base UserDTO.
 *
 * The lockedUntil description is the copy that diverged in COU-261: before the
 * fix, user.examples.ts carried the short text without the trailing period.
 */
const ADMIN_USER_DTO_LOCKED_UNTIL_DESCRIPTION =
  'Fecha y hora en la que la cuenta se desbloquea sola; null si no está bloqueada. Solo lectura.';

const EXPECTED_USER_RESPONSE_PROPERTIES = [
  'id',
  'name',
  'lastName',
  'email',
  'userName',
  'role',
  'isActive',
  'createdAt',
  'updatedAt',
  'lockedUntil',
  'failedLoginAttempts',
].sort();

function userResponseSchema(document: OpenAPIObject): SchemaLike {
  const schema = (document.components?.schemas as Record<string, SchemaLike>)?.UserResponse;
  expect(schema).toBeDefined();
  return schema as SchemaLike;
}

describe('UserResponse OpenAPI schema (e2e)', () => {
  let app: INestApplication;
  let document: OpenAPIObject;

  beforeAll(async () => {
    app = await createTestApp();
    document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
  });

  afterAll(async () => {
    await app.close();
  });

  it('derives the lockedUntil description from AdminUserDTO, not from the examples copy (S1)', () => {
    const schema = userResponseSchema(document);
    expect(schema.properties?.lockedUntil?.description).toBe(ADMIN_USER_DTO_LOCKED_UNTIL_DESCRIPTION);
  });

  it('documents exactly the same property set as today (S2)', () => {
    const schema = userResponseSchema(document);
    expect(Object.keys(schema.properties ?? {}).sort()).toEqual(EXPECTED_USER_RESPONSE_PROPERTIES);
  });

  it('keeps lockedUntil nullable with format date-time (regresión COU-321)', () => {
    const schema = userResponseSchema(document);
    const lockedUntil = schema.properties?.lockedUntil as SchemaLike;
    expect(lockedUntil.nullable).toBe(true);
    expect(lockedUntil.format).toBe('date-time');
  });
});
