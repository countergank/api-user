import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { createTestApp } from '../../helpers/create-test-app';

type Operation = { tags?: string[] };

type DocumentedOperation = {
  path: string;
  method: string;
  tags: string[] | undefined;
};

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'];

function documentedOperations(document: OpenAPIObject): DocumentedOperation[] {
  const paths = document.paths as unknown as Record<string, Record<string, Operation>>;
  const collected: DocumentedOperation[] = [];
  for (const [path, methods] of Object.entries(paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      if (HTTP_METHODS.includes(method)) {
        collected.push({ path, method, tags: operation?.tags });
      }
    }
  }
  return collected;
}

function expectedTag(path: string): string {
  if (path.startsWith('/admin/users')) {
    return path.includes('/sessions') || path.includes('/logout-all') ? 'Admin Sessions' : 'Admin Users';
  }
  if (path.startsWith('/users')) {
    return 'Profile';
  }
  return 'parameters';
}

const IN_SCOPE_PREFIXES = ['/admin/users', '/users', '/admin/parameters'];

/**
 * Issue #558: the three user controllers used to share the `users` tag, so
 * Scalar grouped admin and self-profile endpoints in a single section. Every
 * operation under the user and parameter controllers is pinned to its
 * controller tag, so a new endpoint without a tag fails here instead of
 * rendering as an orphan Scalar section.
 */
describe('OpenAPI tags per user controller (e2e)', () => {
  let app: INestApplication;
  let document: OpenAPIObject;

  beforeAll(async () => {
    app = await createTestApp();
    document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('tags every user and parameter operation with its controller tag (issue #558)', () => {
    const inScope = documentedOperations(document).filter((operation) =>
      IN_SCOPE_PREFIXES.some((prefix) => operation.path.startsWith(prefix)),
    );
    expect(inScope.length).toBeGreaterThanOrEqual(20);
    for (const operation of inScope) {
      const label = `${operation.method.toUpperCase()} ${operation.path}`;
      expect({ [label]: operation.tags }).toEqual({ [label]: [expectedTag(operation.path)] });
    }
  });
});
