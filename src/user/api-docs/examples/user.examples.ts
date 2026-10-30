import { AdminUserDTO } from '../../dto/admin-user.dto';

/**
 * Swagger-facing view of an admin user response.
 *
 * It deliberately declares no properties of its own: the metadata comes from
 * `AdminUserDTO` (and its base `UserDTO`), so a description or example change in
 * the DTO reaches the generated document without editing this file (COU-319).
 * It must derive from `AdminUserDTO`, not `UserDTO` (COU-346): deriving from the
 * base would drop exactly the two lock-state fields from the admin schema.
 * Redeclaring properties here is how the two texts drifted apart in COU-261.
 */
export class UserResponse extends AdminUserDTO {}
