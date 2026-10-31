/**
 * Jest coverage baseline for a NestJS project.
 *
 * Copy into the project root and let CI run `jest --coverage`: the thresholds
 * below are enforced, so a pull request that lowers coverage fails the build.
 */
module.exports = {
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 70,
      functions: 80,
      lines: 80,
    },
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.module.ts',
    '!src/main.ts',
    '!src/**/*.dto.ts',
  ],
};
