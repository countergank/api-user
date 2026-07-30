---
priority: P1
category: architecture
---

# Organize modules by feature, not by technical layer

**Do**: Structure directories and modules around business domains (e.g., `users/`, `orders/`, `payments/`) rather than technical layers (e.g., `controllers/`, `services/`).
**Avoid**: Creating a flat structure where all controllers are in one folder and all services in another, which couples unrelated features.
**Example**:
```
src/
  users/
    users.module.ts
    users.controller.ts
    users.service.ts
    dto/
  orders/
    orders.module.ts
    ...
```
