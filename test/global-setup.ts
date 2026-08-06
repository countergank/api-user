require('reflect-metadata');
require('ts-node/register');

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app/app.module';
import { PermissionService } from '../src/rbac/services/permission.service';
import { RoleService } from '../src/rbac/services/role.service';

export default async function (): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);
  const permissionService = app.get(PermissionService);
  const roleService = app.get(RoleService);

  await permissionService.seedDefaultPermissions();
  await roleService.seedDefaultRoles();

  await app.close();
}
