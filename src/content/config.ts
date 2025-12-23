import { defineCollection, z } from 'astro:content';

const writing = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    pubDate: z.coerce.date(),
    description: z.string(),
    author: z.string().default('Anonymous'),
    ogImage: z.string().optional(), // OpenGraph image path
  }),
});

export const collections = { writing };

