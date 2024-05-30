import { VersionReqDTO } from '../dto/version-req.dto';
import { VersionMock } from './version.mock';

export class VersionReqDTOMock extends VersionReqDTO {
  constructor() {
    super({
      payload: {
        ...new VersionMock(),
      },
    });

    return this;
  }
}
