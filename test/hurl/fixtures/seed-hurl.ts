/**
 * Fixtures de la suite Hurl (COU-325).
 *
 * Crea los usuarios que necesitan los flujos, en un estado determinístico. Es
 * idempotente: borra y recrea, así que cada corrida arranca igual sin importar
 * qué dejó la anterior (por ejemplo, el cambio de email del flujo 04).
 *
 * El login no exige email verificado (sólo credenciales, lock e `isActive`), así
 * que alcanza con crear los usuarios activos.
 *
 * Ejecución: npx ts-node test/hurl/fixtures/seed-hurl.ts
 */
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppModule } from '../../../src/app/app.module';
import { User, UserRole } from '../../../src/user/entities/user.entity';
import { UserService } from '../../../src/user/service/user.service';

export const HURL_PASSWORD = 'HurlFlow1@';

/**
 * Dirección destino del cambio de email. **No se crea como usuario**: la API responde 409
 * si la dirección ya está tomada, así que tiene que estar libre. Se borra por si quedó de
 * una corrida anterior.
 */
export const HURL_FREE_EMAIL = 'hurl.flow.new@test.com';

export const HURL_USERS = {
  /** Sujeto del flujo de cambio de email. */
  flow: { email: 'hurl.flow@test.com', userName: 'hurl-flow', role: UserRole.USER },
  /** Cuenta bloqueada de verdad: el login responde 423 y el admin ve el estado. */
  locked: { email: 'hurl.locked@test.com', userName: 'hurl-locked', role: UserRole.USER },
  /** Usuario sin permisos, para el 403 del guard de roles. */
  viewer: { email: 'hurl.viewer@test.com', userName: 'hurl-viewer', role: UserRole.USER },
  /** Admin propio de la suite, independiente de los seeds de desarrollo. */
  admin: { email: 'hurl.admin@test.com', userName: 'hurl-admin', role: UserRole.ADMIN },
} as const;

const LOCK_MINUTES = 15;
const FAILED_ATTEMPTS = 5;

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const userModel = app.get<Model<User>>(getModelToken(User.name));
  const userService = app.get(UserService);

  const emails = [...Object.values(HURL_USERS).map((u) => u.email), HURL_FREE_EMAIL];
  await userModel.deleteMany({ email: { $in: emails } }).exec();

  for (const user of Object.values(HURL_USERS)) {
    const created = await userService.createWithRole({
      email: user.email,
      userName: user.userName,
      password: HURL_PASSWORD,
      name: 'Hurl',
      lastName: 'Fixture',
      role: user.role,
      permissions: [],
      isActive: true,
    });

    if (user.email === HURL_USERS.locked.email) {
      // El umbral de intentos es configurable y en CI vale 100, así que el bloqueo
      // se siembra. El 423 del flujo demuestra que la aplicación lo trata como tal.
      await userModel
        .updateOne(
          { _id: created._id },
          {
            failedLoginAttempts: FAILED_ATTEMPTS,
            lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60 * 1000),
          },
        )
        .exec();
    }
  }

  await app.close();
  process.stdout.write(`fixtures hurl listos: ${emails.join(', ')}\n`);
}

main().catch((error) => {
  process.stderr.write(`fallo al sembrar fixtures hurl: ${String(error)}\n`);
  process.exit(1);
});
