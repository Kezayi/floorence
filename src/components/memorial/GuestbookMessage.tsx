interface GuestbookMessageProps {
  authorName: string;
  relationCategory: string;
  content: string;
  createdAt: string;
}

const GuestbookMessage = ({
  authorName,
  relationCategory,
  content,
  createdAt,
}: GuestbookMessageProps) => {
  const formattedDate = new Date(createdAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <article className="py-6 border-b border-memorial-dark-muted/20 last:border-0">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h4 className="font-serif text-lg text-memorial-dark-foreground">
            {authorName}
          </h4>
          <span className="inline-block mt-1 px-2 py-0.5 bg-memorial-dark-muted/20 text-memorial-dark-muted text-xs font-sans">
            {relationCategory}
          </span>
        </div>
        <time className="text-xs text-memorial-dark-muted font-sans">
          {formattedDate}
        </time>
      </div>
      <p className="font-serif text-base leading-relaxed text-memorial-dark-foreground/90 italic">
        "{content}"
      </p>
    </article>
  );
};

export default GuestbookMessage;
