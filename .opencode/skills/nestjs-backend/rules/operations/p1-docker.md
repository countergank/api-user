---
priority: P1
category: operations
---

# Use multi-stage Docker builds for production images

**Do**: Build the application in a full Node image, then copy only the compiled output and production dependencies into a `node:slim` or `alpine` runtime image.
**Avoid**: Shipping development dependencies, source maps, or the full Node toolchain in production containers.
**Example**:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
ENV NODE_ENV=production
CMD ["node", "dist/main"]
```
