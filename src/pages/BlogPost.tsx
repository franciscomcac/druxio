import { useParams, Link, useNavigate } from "react-router-dom";
import { useSEO } from "@/hooks/use-seo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getBlogPost, blogPosts } from "@/data/blog-posts";
import { Clock, ArrowLeft, ArrowRight, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Simple markdown-to-JSX renderer ────────────────────────────

interface ProseLikeProps {
  children?: React.ReactNode;
  className?: string;
}

const ProseLike = ({ children, className }: ProseLikeProps) => {
  return (
    <div className={cn("text-muted-foreground leading-relaxed", className)}>
      {children}
    </div>
  );
};

const ProseH1 = ({ children }: { children: React.ReactNode }) => {
  return <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">{children}</h1>;
};

const ProseH2 = ({ children }: { children: React.ReactNode }) => {
  return <h2 className="mt-10 scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight transition-colors first:mt-0">{children}</h2>;
};

const ProseH3 = ({ children }: { children: React.ReactNode }) => {
  return <h3 className="mt-8 scroll-m-20 text-2xl font-semibold tracking-tight">{children}</h3>;
};

const ProseH4 = ({ children }: { children: React.ReactNode }) => {
  return <h4 className="mt-8 scroll-m-20 text-xl font-semibold tracking-tight">{children}</h4>;
};

const ProseP = ({ children }: { children: React.ReactNode }) => {
  return <p className="leading-7 [&:not(:first-child)]:mt-6">{children}</p>;
};

const ProseA = ({ children, href }: { children: React.ReactNode; href: string }) => {
  return <Link to={href} className="font-semibold text-foreground underline underline-offset-4">{children}</Link>;
};

function renderContent(raw: string) {
  const lines = raw.trim().split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;
  let i = 0;

  const inlineFormat = (text: string): React.ReactNode => {
    const parts = text.split(/(\*\*[^**]+\*\*)/g);
    return parts.map((part, pi) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={pi} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { i++; continue; }

    if (line.startsWith("## ")) {
      elements.push(<h2 key={key++} className="text-2xl font-bold text-foreground mt-10 mb-4 leading-snug">{line.slice(3)}</h2>);
      i++; continue;
    }

    if (line.startsWith("### ")) {
      elements.push(<h3 key={key++} className="text-lg font-semibold text-foreground mt-7 mb-2">{line.slice(4)}</h3>);
      i++; continue;
    }

    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={key++} className="my-4 space-y-2">
          {items.map((item, li) => (
            <li key={li} className="flex items-start gap-2 text-foreground/80 leading-relaxed">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              <span>{inlineFormat(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    elements.push(<p key={key++} className="text-foreground/80 leading-[1.85] my-4">{inlineFormat(line)}</p>);
    i++;
  }

  return elements;
}

// ─── Component ───────────────────────────────────────────────────

const categoryColor: Record<string, string> = {
  Announcement: "bg-primary/10 text-primary border-primary/20",
  Platform: "bg-accent text-accent-foreground border-border",
  Insights: "bg-muted text-muted-foreground border-border",
};

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const post = getBlogPost(slug || "");

  // Parse date string like "February 18, 2026" to ISO
  const publishedIso = post ? (() => {
    try {
      return new Date(post.date).toISOString();
    } catch { return undefined; }
  })() : undefined;

  useSEO({
    title: post ? post.title : "Post Not Found",
    description: post ? post.excerpt : undefined,
    canonical: post ? `/blog/${post.slug}` : undefined,
    ogImage: post?.coverImage || undefined,
    ogType: "article",
    articlePublishedTime: publishedIso,
    jsonLd: post ? [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": post.title,
        "description": post.excerpt,
        "image": post.coverImage || undefined,
        "datePublished": publishedIso,
        "author": {
          "@type": "Organization",
          "name": post.author
        },
        "publisher": {
          "@type": "Organization",
          "name": "Druxio",
          "url": "https://druxio.lovable.app"
        },
        "mainEntityOfPage": `https://druxio.lovable.app/blog/${post.slug}`
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://druxio.lovable.app/" },
          { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://druxio.lovable.app/blog" },
          { "@type": "ListItem", "position": 3, "name": post.title, "item": `https://druxio.lovable.app/blog/${post.slug}` },
        ],
      },
    ] : undefined,
  });

  if (!post) {
    return (
      <div className="container mx-auto px-4 py-24 text-center max-w-xl">
        <p className="text-4xl mb-4">📄</p>
        <h1 className="text-2xl font-bold text-foreground mb-2">Post not found</h1>
        <p className="text-muted-foreground mb-6">This article doesn't exist or has been removed.</p>
        <Button onClick={() => navigate("/blog")}>Back to Blog</Button>
      </div>
    );
  }

  const currentIndex = blogPosts.findIndex(p => p.slug === slug);
  const prev = blogPosts[currentIndex - 1] ?? null;
  const next = blogPosts[currentIndex + 1] ?? null;

  return (
    <>
      {/* Breadcrumb */}
      <div className="border-b border-border bg-card/40">
        <div className="container mx-auto px-4 py-3 max-w-3xl">
          <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Blog
          </Link>
        </div>
      </div>

      {/* Cover Image */}
      {post.coverImage && (
        <div className="w-full max-w-4xl mx-auto animate-fade-in">
          <img
            src={post.coverImage}
            alt={post.title}
            className="w-full h-auto max-h-[420px] object-cover"
            loading="eager"
          />
        </div>
      )}

      {/* Article */}
      <article className="container mx-auto px-4 py-12 max-w-3xl">
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-5 flex-wrap animate-fade-in" style={{ animationDelay: "100ms", animationFillMode: "both" }}>
            <Badge className={cn("text-xs border", categoryColor[post.category] ?? "bg-muted text-muted-foreground")}>
              {post.category}
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> {post.readTime}
            </span>
            <span className="text-xs text-muted-foreground">{post.date}</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight mb-5 animate-fade-in" style={{ animationDelay: "200ms", animationFillMode: "both" }}>
            {post.title}
          </h1>

          <p className="text-lg text-muted-foreground leading-relaxed mb-7 border-l-2 border-primary/30 pl-4 animate-fade-in" style={{ animationDelay: "300ms", animationFillMode: "both" }}>
            {post.excerpt}
          </p>

          <div className="flex items-center gap-3 py-4 border-y border-border animate-fade-in" style={{ animationDelay: "400ms", animationFillMode: "both" }}>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Zap className="h-4 w-4 text-primary fill-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{post.author}</p>
              <p className="text-xs text-muted-foreground">{post.authorRole}</p>
            </div>
          </div>
        </header>

        <div className="prose-like animate-fade-in" style={{ animationDelay: "500ms", animationFillMode: "both" }}>
          {renderContent(post.content)}
        </div>

        <div className="mt-14 rounded-xl border border-primary/20 bg-primary/5 p-7 text-center animate-fade-in" style={{ animationDelay: "600ms", animationFillMode: "both" }}>
          <div className="inline-flex items-center gap-1.5 text-primary font-semibold text-lg mb-2">
            Ready to get expert help? <Zap className="h-4 w-4 fill-primary" />
          </div>
          <p className="text-muted-foreground text-sm mb-5 max-w-sm mx-auto">
            Post your request in minutes and receive quotes from verified experts — fast.
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            <Button asChild>
              <Link to="/post-request">Post a Task</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/search">Browse Experts</Link>
            </Button>
          </div>
        </div>

        {(prev || next) && (
          <div className="mt-12 flex items-center justify-between gap-4 border-t border-border pt-8">
            {prev ? (
              <Link to={`/blog/${prev.slug}`} className="group flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><ArrowLeft className="h-3 w-3" /> Previous</p>
                <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">{prev.title}</p>
              </Link>
            ) : <div className="flex-1" />}

            {next ? (
              <Link to={`/blog/${next.slug}`} className="group flex-1 min-w-0 text-right">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1 justify-end">Next <ArrowRight className="h-3 w-3" /></p>
                <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">{next.title}</p>
              </Link>
            ) : <div className="flex-1" />}
          </div>
        )}
      </article>
    </>
  );
};

export default BlogPost;
