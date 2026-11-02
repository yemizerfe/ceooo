import { defineConfig } from 'prisma/config';

export default defineConfig({
  earlyAccess: true,
  schema: './prisma/schema.prisma',
  seed: {
    command: 'bun prisma/seed.ts',
  },
});
