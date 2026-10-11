import { ChevronLeft, Eye, FileText, Lightbulb, MessageSquareQuote, Paperclip, Video } from "lucide-react";
import type { ProductGuide, GuideLang } from "./types";
import { localisedGuide } from "./types";
import { isHttpUrl, youtubeId } from "@/lib/validators";

interface ProductGuideDetailProps {
  guide: ProductGuide;
  lang: GuideLang;
  /** The catalog description shown to the customer below the product photo
   *  on their match result — pulled live from src/data/products.ts or
   *  custom_products. Not editable here; it mirrors what the customer reads. */
  customerDescription: string;
  onBack: () => void;
}

// Renders one content section. Body text is plain text authored in /manager —
// newlines are preserved; empty sections show a soft hint.
const Section = ({
  icon, title, body, accent = "sky",
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  accent?: "sky" | "amber";
}) => {
  const ring = accent === "amber" ? "bg-amber-500/15 text-amber-400" : "bg-sky-500/15 text-sky-400";
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${ring}`}>{icon}</span>
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
      </div>
      {body.trim() ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{body}</p>
      ) : (
        <p className="text-xs italic text-muted-foreground/60">Not filled in yet.</p>
      )}
    </div>
  );
};

export const ProductGuideDetail = ({ guide, lang, customerDescription, onBack }: ProductGuideDetailProps) => {
  const { description, insight1, insight2, managerAdvice } = localisedGuide(guide, lang);
  const videoLink = guide.video_url.trim();
  const videoId = videoLink ? youtubeId(videoLink) : null;
  const isHttpLink = isHttpUrl(videoLink);

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to all products
      </button>

      <div>
        <h2 className="text-lg font-bold text-foreground">{guide.product_name}</h2>
        <p className="text-xs text-muted-foreground">
          Updated {new Date(guide.updated_at).toLocaleDateString()}
        </p>
      </div>

      {/* What the customer sees — the exact catalog text shown below the product
          photo on the match result. Read-only, mirrored live from the catalog. */}
      <div className="rounded-2xl border border-sky-500/30 bg-sky-500/5 p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400">
            <Eye className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-foreground">What the customer sees</h3>
            <p className="text-[10px] text-muted-foreground">
              Text shown under the product photo on the customer's match result
            </p>
          </div>
        </div>
        {customerDescription.trim() ? (
          <p className="text-sm italic leading-relaxed text-muted-foreground">
            “{customerDescription}”
          </p>
        ) : (
          <p className="text-xs italic text-muted-foreground/60">
            No catalog description found for this product.
          </p>
        )}
      </div>

      {/* Product video — the manager's 30-second explainer link */}
      {videoLink && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400">
              <Video className="h-4 w-4" />
            </span>
            <h3 className="text-sm font-bold text-foreground">Product video</h3>
          </div>
          {videoId ? (
            <div className="aspect-video overflow-hidden rounded-xl border border-border">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${videoId}`}
                title="Product video"
                className="h-full w-full"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : isHttpLink ? (
            <a
              href={videoLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-sky-400 underline"
            >
              Open video ↗
            </a>
          ) : (
            <p className="text-xs italic text-muted-foreground/60">Invalid video link.</p>
          )}
        </div>
      )}

      {/* 1. Description */}
      <Section icon={<FileText className="h-4 w-4" />} title="Product description" body={description} />

      {/* 2. Two consultant insights */}
      <Section icon={<Lightbulb className="h-4 w-4" />} title="Insight 1" body={insight1} />
      <Section icon={<Lightbulb className="h-4 w-4" />} title="Insight 2" body={insight2} />

      {/* 3. Manager's advice */}
      <Section
        icon={<MessageSquareQuote className="h-4 w-4" />}
        title="Manager's advice"
        body={managerAdvice}
        accent="amber"
      />

      {/* 4. Files & manuals — STANDBY (structure ready, feature not yet active) */}
      <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground">
            <Paperclip className="h-4 w-4" />
          </span>
          <h3 className="text-sm font-bold text-muted-foreground">Files &amp; manuals</h3>
          <span className="ml-auto rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
            Coming soon
          </span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground/70">
          Downloadable spec sheets and manuals uploaded by the manager will appear here.
        </p>
      </div>
    </div>
  );
};
