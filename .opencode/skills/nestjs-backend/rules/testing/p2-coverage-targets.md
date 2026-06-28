---
priority: P2
category: testing
---

# Set coverage targets and enforce them in CI

**Do**: Configure Jest coverage thresholds in `jest.config.js` with minimum percentages for statements, branches, functions, and lines.
**Avoid**: Merging code that reduces overall test coverage or adding untested critical paths.
**Example**:
```javascript
// jest.config.js
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
  ],
};
```
