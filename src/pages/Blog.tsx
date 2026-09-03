import { Link } from "react-router-dom";
import { useSEO } from "@/hooks/use-seo";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { blogPosts } from "@/data/blog-posts";
import { Clock, ArrowRight, Zap } from "lucide-react";

const categoryColor: Record<string, string> = {
  Announcement: "bg-primary/10 text-primary border-primary/20",
  Platform: "bg-accent text-accent-foreground border-border",
  Insights: "bg-muted text-muted-foreground border-border",
};

const Blog = () => {
  useSEO({
    title: "Blog — Freelancing Tips & Platform Updates",
    description: "Tips, guides, and insights on getting work done faster with Druxio. Platform updates, expert advice, and freelancing best practices.",
    canonical: "/blog",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": "Druxio Blog",
      "description": "Tips, guides, and insights on getting work done faster with Druxio.",
      "url": "https://druxio.net/blog",
      "publisher": {
        "@type": "Organization",
        "name": "Druxio",
        "url": "https://druxio.net"
      },
      "mainEntity": {
        "@type": "ItemList",
        "itemListElement": blogPosts.map((post, i) => ({
          "@type": "ListItem",
          "position": i + 1,
          "url": `https://druxio.net/blog/${post.slug}`,
          "name": post.title
        }))
      }
    },
  });

  const [featured, ...rest] = blogPosts;

  return (
    <>
      {/* Hero */}
      <div className="border-b border-border bg-card/50">
        <div className="container mx-auto px-4 py-14 max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary mb-4 animate-fade-in">
            <Zap className="h-3 w-3 fill-primary" />
            Druxio Blog
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 tracking-tight animate-fade-in" style={{ animationDelay: "100ms", animationFillMode: "both" }}>
            Stories, updates, and insights
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto animate-fade-in" style={{ animationDelay: "200ms", animationFillMode: "both" }}>
            Thoughts on the future of on-demand expertise, platform updates, and how people are using Druxio to get unstuck.
          </p>
        </div>
      </div>

      <main className="container mx-auto px-4 py-12 max-w-4xl">

        {/* Featured post */}
        <Link to={`/blog/${featured.slug}`} className="group block mb-10 animate-fade-in" style={{ animationDelay: "300ms", animationFillMode: "both" }}>
          <Card className="overflow-hidden border-border hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            {featured.coverImage && (
              <img
                src={featured.coverImage}
                alt={featured.title}
                className="w-full h-56 md:h-72 object-cover"
                loading="eager"
              />
            )}
            <CardContent className="p-7 md:p-10">
              <div className="flex items-center gap-3 mb-4">
                <Badge className={`text-xs border ${categoryColor[featured.category] ?? "bg-muted text-muted-foreground"}`}>
                  {featured.category}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {featured.readTime}
                </span>
                <span className="text-xs text-muted-foreground">{featured.date}</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors leading-snug">
                {featured.title}
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-5 max-w-2xl">
                {featured.excerpt}
              </p>
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="font-medium text-foreground">{featured.author}</span>
                  <span className="text-muted-foreground"> · {featured.authorRole}</span>
                </div>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary group-hover:gap-2.5 transition-all">
                  Read post <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Remaining posts */}
        <div className="grid md:grid-cols-2 gap-5">
          {rest.map((post, i) => (
            <Link key={post.slug} to={`/blog/${post.slug}`} className="group block animate-fade-in" style={{ animationDelay: `${400 + i * 100}ms`, animationFillMode: "both" }}>
              <Card className="h-full overflow-hidden border-border hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                {post.coverImage && (
                  <img
                    src={post.coverImage}
                    alt={post.title}
                    className="w-full h-40 object-cover"
                    loading="lazy"
                  />
                )}
                <CardContent className="p-6 flex flex-col h-full">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className={`text-xs border ${categoryColor[post.category] ?? "bg-muted text-muted-foreground"}`}>
                      {post.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {post.readTime}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors leading-snug">
                    {post.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed flex-1 mb-4">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-xs text-muted-foreground">{post.date}</span>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-primary group-hover:gap-2 transition-all">
                      Read <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
};

export default Blog;
