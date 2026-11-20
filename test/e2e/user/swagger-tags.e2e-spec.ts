import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { createTestApp } from '../../helpers/create-test-app';

type Operation = { tags?: string[] };

function operation(document: OpenAPIObject, path: string, method: string): Operation {
  const paths = document.paths as unknown as Record<string, Record<string, Operation>>;
  const operation = paths[path]?.[method];
  expect(operation).toBeDefined();
  return operation as Operation;
}

/**
 * Issue #558: the three user controllers used to share the `users` tag, so
 * Scalar grouped admin and self-profile endpoints in a single section. Each
 * controller now documents under its own tag.
 */
describe('OpenAPI tags per user controller (e2e)', () => {
  let app: INestApplication;
  let document: OpenAPIObject;

  beforeAll(async () => {
    app = await createTestApp();
    document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([
    ['GET', '/admin/users', 'Admin Users'],
    ['GET', '/admin/users/{id}/sessions', 'Admin Sessions'],
    ['GET', '/users/profile', 'Profile'],
    ['GET', '/admin/parameters', 'parameters'],
    ['GET', '/admin/parameters/{group}', 'parameters'],
    ['PUT', '/admin/parameters/{key}', 'parameters'],
  ])('tags %s %s as %s (issue #558)', (method, path, tag) => {
    expect(operation(document, path, method.toLowerCase()).tags).toEqual([tag]);
  });
});
