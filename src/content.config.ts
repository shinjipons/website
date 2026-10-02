import { defineCollection } from "astro:content";
import { file } from "astro/loaders";
import { z } from "astro/zod";

const social = defineCollection({
  loader: file("src/data/social.json"),
  schema: z.object({
    order: z.number(),
    name: z.string(),
    url: z.url(),
  }),
});

export const collections = { social };
