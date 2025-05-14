import { faker } from '@faker-js/faker';

export class HashMock {
  private hash: string;
  constructor() {
    this.hash = faker.string.alphanumeric(60);
  }

  getMock() {
    return this.hash;
  }
}
