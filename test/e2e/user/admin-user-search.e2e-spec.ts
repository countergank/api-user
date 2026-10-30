import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import request from 'supertest';
import { User, UserRole } from '../../../src/user/entities/user.entity';
import { createTestApp } from '../../helpers/create-test-app';

/**
 * COU-347: the console topbar sends one term for name, last name, email and `@userName`.
 * `?search=` already covered the four fields, so this spec pins the part that was missing
 * (the `@userName` prefix) and the literal-regex guarantee, per field, against its own fixtures.
 */
describe('Admin user search (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;

  const run = `srch${Date.now()}`;
  const password = 'Adm1nW0rd!x';

  // Each fixture is matched by exactly one field, so a passing assertion names the field:
  // "Ana" (name), "Lopez" (lastName), "mailana" (email), "usr-ana" (userName).
  const fixtures = [
    {
      name: 'Ana',
      lastName: 'Lopez',
      email: `mailana-${run}@example.com`,
      userName: `usr-ana-${run}`,
    },
    {
      name: 'Bob',
      lastName: 'Diaz',
      email: `mailbob-${run}@example.com`,
      userName: `usr-bob-${run}`,
    },
    // Only reachable through the unescaped `.` of a "a.b" pattern, never through a literal search.
    {
      name: 'axb',
      lastName: 'Regex',
      email: `mailregex-${run}@example.com`,
      userName: `usr-regex-${run}`,
    },
  ];

  // The e2e database is shared between runs, so name/lastName searches also hit fixtures from a
  // previous run. Every assertion is scoped to this run's token so the test cannot drift.
  const runScopedUserNames = (data: { userName: string }[]) =>
    data.filter((u) => u.userName.includes(run)).map((u) => u.userName);

  const search = async (term: string, extraQuery = '') => {
    const res = await request(app.getHttpServer())
      .get(`/admin/users?search=${encodeURIComponent(term)}${extraQuery}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    return {
      ids: (res.body.data as { id: string }[]).map((u) => u.id),
      total: res.body.total as number,
      data: res.body.data as { userName: string }[],
    };
  };

  beforeAll(async () => {
    app = await createTestApp();

    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `admin-${run}@example.com`,
        userName: `admin-${run}`,
        password,
        name: 'Admin',
        lastName: 'Search',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({ token: registerRes.body.verificationToken })
      .expect(200);

    const userModel = app.get<Model<User>>(getModelToken(User.name));
    await userModel.updateOne({ _id: registerRes.body.user.id }, { role: UserRole.ADMIN });

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: `admin-${run}@example.com`, password })
      .expect(200);
    adminToken = loginRes.body.accessToken;

    for (const fixture of fixtures) {
      await request(app.getHttpServer())
        .post('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...fixture, password })
        .expect(201);
    }
  }, 60000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  }, 10000);

  describe('search covers the four fields', () => {
    it('matches by name', async () => {
      const res = await search('Ana');

      expect(runScopedUserNames(res.data)).toEqual([expect.stringContaining('usr-ana')]);
    });

    it('matches by last name', async () => {
      const res = await search('Lopez');

      expect(runScopedUserNames(res.data)).toEqual([expect.stringContaining('usr-ana')]);
    });

    it('matches by email', async () => {
      const res = await search(`mailana-${run}`);

      expect(runScopedUserNames(res.data)).toEqual([expect.stringContaining('usr-ana')]);
    });

    it('matches by user name', async () => {
      const res = await search(`usr-bob-${run}`);

      expect(runScopedUserNames(res.data)).toEqual([expect.stringContaining('usr-bob')]);
    });
  });

  describe('the @userName form from the console topbar', () => {
    it('resolves @userName against userName', async () => {
      const res = await search(`@usr-ana-${run}`);

      expect(res.data.map((u) => u.userName)).toEqual([expect.stringContaining('usr-ana')]);
    });

    it('keeps matching an @-prefixed email fragment', async () => {
      // A term starting with @ is also a piece of an email. The @ form must ADD a userName
      // lookup, never replace the four-field search.
      const res = await search(`@example.com`);

      // The admin account created in beforeAll also carries an @example.com email.
      expect(runScopedUserNames(res.data).sort()).toEqual(
        [`usr-ana-${run}`, `usr-bob-${run}`, `usr-regex-${run}`, `admin-${run}`].sort(),
      );
    });

    it('does not treat @userName as a substring of the email', async () => {
      // "mailana" only exists in the email, so a @userName search must not find Ana.
      const res = await search('@mailana');

      expect(res.total).toBe(0);
    });
  });

  describe('regex metacharacters are literal', () => {
    it('does not let a dot match any character', async () => {
      // User "axb" exists; an unescaped `a.b` would match it.
      const res = await search('a.b');

      expect(res.total).toBe(0);
    });

    it('accepts an unbalanced parenthesis instead of failing', async () => {
      const res = await search('(');

      expect(res.total).toBe(0);
    });
  });

  it('paginates the filtered set instead of the whole list', async () => {
    const res = await search(run, '&limit=1');

    expect(Array.isArray(res.data)).toBe(true);
    expect(res.data).toHaveLength(1);
    // The three fixtures plus the admin account all carry the run token.
    expect(res.total).toBe(fixtures.length + 1);
  });
});
