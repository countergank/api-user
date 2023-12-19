import { Test, TestingModule } from '@nestjs/testing';
import { EncodeService } from './encode.service';

describe(EncodeService.name, () => {
  let service: EncodeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EncodeService],
    }).compile();

    service = module.get<EncodeService>(EncodeService);
  });

  it(`${EncodeService.name} should be defined`, () => {
    expect(service).toBeDefined();
  });

  describe(`${EncodeService.name}.${EncodeService.prototype.hash}`, () => {
    it(`should be return a string`, () => {
      expect(typeof service.hash('root')).toBe('string');
    });
  });

  describe(`${EncodeService.name}.${EncodeService.prototype.compare}`, () => {
    const value = 'root';
    it(`should be return a string`, () => {
      const hash = service.hash(value);
      expect(service.compare(value, hash)).toBe(true);
    });
  });
});
