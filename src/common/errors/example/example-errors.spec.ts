import { ExampleInstanceError } from './example-instance.error';
import { ExampleErrorAlias, ExampleErrorMessage } from './example.dictionary';

describe(ExampleInstanceError.name, () => {
  it(`should create en instance of ${ExampleInstanceError.name}`, () => {
    const error = new ExampleInstanceError();

    expect(error).toBeInstanceOf(ExampleInstanceError);
    expect(error.message).toBe(ExampleErrorMessage[ExampleErrorAlias.ExampleAlias]);
    expect(error.code.includes(ExampleErrorAlias.ExampleAlias)).toBeTruthy();
  });
});
