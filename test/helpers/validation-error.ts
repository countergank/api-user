/**
 * Assert the error contract the production global ValidationPipe
 * (`src/common/pipes/validation.pipe.ts`) publishes on a rejected body:
 *
 *   400 + `code: UA-COM-005` + `details` naming the rejected property.
 *
 * The pipe's `exceptionFactory` publishes `details: [{ property, constraints: [<names>] }]`
 * — constraint *names*, never the constraint messages — so the exact rule that failed is
 * asserted by the validator unit specs, not by e2e.
 */
export function expectValidationError(
  body: Record<string, any>,
  property: string,
): void {
  expect(body).toMatchObject({ statusCode: 400, code: 'UA-COM-005' });

  const rejected = ((body.details as any[]) ?? []).map((detail: any) => detail.property);
  expect(rejected).toContain(property);
}
