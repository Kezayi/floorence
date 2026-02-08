interface JsonLdPersonProps {
  name: string;
  birthDate?: string | null;
  deathDate?: string | null;
  description?: string | null;
  image?: string | null;
  url: string;
}

/**
 * Renders a JSON-LD Person schema for memorial SEO.
 * Helps search engines understand memorial pages as structured data about a person.
 */
const JsonLdPerson = ({ name, birthDate, deathDate, description, image, url }: JsonLdPersonProps) => {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    url,
  };

  if (birthDate) schema.birthDate = birthDate;
  if (deathDate) schema.deathDate = deathDate;
  if (description) schema.description = description.length > 200 ? description.substring(0, 197) + "…" : description;
  if (image) schema.image = image;

  // Add the memorial page as a memorial/tribute
  schema.subjectOf = {
    "@type": "WebPage",
    url,
    name: `Hommage à ${name}`,
    description: `Espace mémoriel dédié à ${name} sur Floorence.`,
    isPartOf: {
      "@type": "WebSite",
      name: "Floorence",
      url: "https://floorence.lovable.app",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
};

export default JsonLdPerson;
