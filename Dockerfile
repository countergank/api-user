###################################
# BASE IMAGE FOR ALL STAGES
###################################
FROM node:22-alpine AS base

# Set working directory
WORKDIR /usr/src/app

# Install dependencies needed for node-gyp and others (optional)
RUN apk add --no-cache python3 make g++

###################################
# DEVELOPMENT STAGE
###################################
FROM base AS development

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .

# Solo crear y dar permisos al directorio necesario
RUN mkdir -p /usr/src/app/dist && chown -R node:node /usr/src/app/dist

# ⚠️ No usar USER node aquí si montas volúmenes
# USER node

CMD ["npm", "run", "start:dev"]

###################################
# BUILD STAGE
###################################
FROM base AS build

COPY --chown=node:node package*.json ./
COPY --from=development /usr/src/app/node_modules ./node_modules
COPY --chown=node:node . .

# Build the app
RUN npm run build

# Clean unnecessary files (optional)
RUN rm -rf src test *.ts *.md .env* node_modules/.cache

###################################
# PRODUCTION STAGE
###################################
FROM node:22-alpine AS production

WORKDIR /usr/src/app

# Copy only package files for production-only install
COPY --chown=node:node package*.json ./

# Fresh production-only install (no devDependencies)
# --ignore-scripts skips lifecycle scripts (prepare runs husky which is a devDependency)
# typescript added explicitly: nestjs-i18n requires it at runtime (peerDependency)
RUN npm ci --omit=dev --ignore-scripts && npm install typescript --save-exact --no-save

# Copy only compiled output from build stage
COPY --from=build --chown=node:node /usr/src/app/dist ./dist

ENV NODE_ENV=production

# Use non-root user
USER node

# Optional: healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD node -e "require('http').get('http://localhost:3000/health', res => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Start the server
CMD ["node", "dist/main.js"]
