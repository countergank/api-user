import { faker } from '@faker-js/faker';

export class HashMock {
  constructor() {
    return faker.string.alphanumeric(60);
  }
}
