import { getDb } from "../server/db";
import { blogPosts } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { readFileSync } from "fs";

interface Article {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  metaTitle?: string;
  metaDescription?: string;
  category?: string;
  tags?: string;
  readTime?: number;
}

async function main() {
  const articles: Article[] = JSON.parse(
    readFileSync("/home/ubuntu/blog_articles.json", "utf-8")
  );

  const db = await getDb();
  if (!db) {
    console.error("No DB connection");
    process.exit(1);
  }

  for (const article of articles) {
    const existing = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.slug, article.slug));

    if (existing.length > 0) {
      console.log("Skip (already exists):", article.slug);
      continue;
    }

    await db.insert(blogPosts).values({
      slug: article.slug,
      title: article.title,
      excerpt: article.excerpt,
      content: article.content,
      metaTitle: article.metaTitle ?? null,
      metaDescription: article.metaDescription ?? null,
      category: article.category ?? "guides",
      tags: article.tags ?? "",
      readTime: article.readTime ?? 6,
      published: true,
    });
    console.log("Inserted:", article.slug);
  }

  console.log("Done! All articles processed.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
