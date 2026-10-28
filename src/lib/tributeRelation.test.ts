import { describe, it, expect } from "vitest";
import { resolvePersonDeceasedPair, reverseTributeRole, contributorRole, readTributeLinks, type TributeLink } from "./tributeRelation";
import { tributeLinks } from "../../supabase/functions/social-search/tributeLinks";

const MEM = "11111111-1111-4111-8111-111111111111";
const mems = [{ id: MEM, first_name: "Marquise", last_name: "TESTA MENGUE" }];
const michel: TributeLink = { memorial_id: MEM, author: "Michel TESTO AYI", identity: "unique", links: ["Petit-fils de la Défunte"] };

describe("relation personne ↔ défunt du même mémorial", () => {
  it("question personne puis défunte → Michel petit-fils", () => {
    const r = resolvePersonDeceasedPair("Quelle relation lien Michel TESTO AYI et Marquise TESTA MENGUE ?".replace("lien", "lien entre"), mems, [michel]);
    expect(r).toMatchObject({ kind: "ok", order: "person-first" });
    expect(contributorRole("Petit-fils de la Défunte")).toBe("petit-fils");
  });
  it("question défunte puis personne → Marquise grand-mère", () => {
    const r = resolvePersonDeceasedPair("Quel lien entre Marquise Testa Mengue et Michel Testo Ayi", mems, [michel]);
    expect(r).toMatchObject({ kind: "ok", order: "deceased-first" });
    expect(reverseTributeRole("Petit-fils de la Défunte")).toBe("grand-mère");
  });
  it("sexe du défunt non indiqué → neutre ; type inconnu → pas d'inversion", () => {
    expect(reverseTributeRole("Fils")).toBe("parent");
    expect(reverseTributeRole("Ami d'enfance")).toBeNull();
  });
  it("homonyme (plusieurs comptes) → ambigu", () => {
    const r = resolvePersonDeceasedPair("lien entre Michel Testo Ayi et Marquise Testa Mengue", mems, [{ ...michel, identity: "ambiguous" }]);
    expect(r).toEqual({ kind: "ambiguous" });
  });
  it("absence d'hommage de la personne → none", () => {
    expect(resolvePersonDeceasedPair("lien entre Paul Autre et Marquise Testa Mengue", mems, [michel])).toEqual({ kind: "none" });
  });
  it("serveur : hommages concordants = une source, conflit conservé, homonymes ambigus, pas d'user_id", () => {
    const out = tributeLinks([
      { memorial_id: MEM, user_id: "u1", author_name: "Michel Testo Ayi", relation_link: "Petit-fils de la Défunte" },
      { memorial_id: MEM, user_id: "u1", author_name: "Michel Testo Ayi", relation_link: "Petit-fils de la Défunte" },
      { memorial_id: MEM, user_id: "u2", author_name: "Jean Conflit", relation_link: "Fils" },
      { memorial_id: MEM, user_id: "u2", author_name: "Jean Conflit", relation_link: "Neveu" },
      { memorial_id: MEM, user_id: "u3", author_name: "Ali Homo", relation_link: "Fils" },
      { memorial_id: MEM, user_id: "u4", author_name: "Ali Homo", relation_link: "Fils" },
      { memorial_id: "autre", user_id: "u5", author_name: "Hors Source", relation_link: "Fils" },
    ], [MEM]);
    expect(out.find((t) => t.author === "Michel Testo Ayi")).toEqual({ memorial_id: MEM, author: "Michel Testo Ayi", identity: "unique", links: ["Petit-fils de la Défunte"] });
    expect(out.find((t) => t.author === "Jean Conflit")!.links).toEqual(["Fils", "Neveu"]);
    expect(out.find((t) => t.author === "Ali Homo")!.identity).toBe("ambiguous");
    expect(out.some((t) => t.author === "Hors Source")).toBe(false);
    expect(JSON.stringify(out)).not.toContain("u1");
    expect(readTributeLinks(out, [])).toEqual([]);
  });
});
