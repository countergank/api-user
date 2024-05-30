import { versionStructure } from '../../common/utils/global';
import { Version } from '../class/version.class';

export class VersionMock extends Version {
  constructor() {
    super({
      version: versionStructure('User Manager', 'local', '1.0.0'),
    });

    return this;
  }
}
