import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { CIVILITIES, isCivility, ispIdentityFilter, matchesCivility, canCompleteIdentity } from '../../supabase/functions/_shared/civility';
import { computeIspFacts, summarizeIsp, isIspQuestion } from '../../supabase/functions/_shared/isp';

const posts = [
  { memorial_id: 'm', user_id: 'a', author_name: 'Alpha Test', relation_category: 'famille_directe', candle_count: 2, flower_count: 0 },
  { memorial_id: 'm', user_id: 'b', author_name: 'Beta Test', relation_category: 'famille_directe', candle_count: 2, flower_count: 0 },
  { memorial_id: 'm', user_id: 'c', author_name: 'Gamma Test', relation_category: 'autres', candle_count: 1, flower_count: 0 },
  { memorial_id: 'm', user_id: 'd', author_name: 'Delta Test', relation_category: 'autres', candle_count: 1, flower_count: 0 },
];
const civilities = new Map<string, unknown>([['a', 'Mme'], ['b', 'Mlle'], ['c', 'M.']]);
describe('FIC-01 declared identity', () => {
  it.each(CIVILITIES)('accepts canonical %s', (c) => expect(isCivility(c)).toBe(true));
  it.each([null, undefined, '', 'Mr', 'Monsieur', 'fils', 'mme', ' M.'])('rejects non canonical %s', (c) => expect(isCivility(c)).toBe(false));
  it('new completion requires civility, historical completion does not', () => {
    expect(canCompleteIdentity(true, null)).toBe(false);
    expect(canCompleteIdentity(true, 'Mme')).toBe(true);
    expect(canCompleteIdentity(false, null)).toBe(true);
  });
  it('detects natural questions without inferring relatives', () => {
    expect(isIspQuestion('Quel homme est le plus sympathique ?')).toBe(true);
    expect(ispIdentityFilter('Quel homme est le plus sympathique ?')).toBe('men');
    expect(ispIdentityFilter('Quelle femme avec le plus fort ISP ?')).toBe('women');
    expect(ispIdentityFilter('ISP des femmes et hommes ?')).toBe('ambiguous');
    expect(isIspQuestion('Quel fils appartient à cette famille ?')).toBe(false);
    expect(ispIdentityFilter('ISP de son fils Michel ?')).toBeNull();
    expect(matchesCivility('fils', 'men')).toBe(false);
  });
  it('filters BEFORE maximum, keeps T and ties below 1', () => {
    const f = computeIspFacts(posts, { identityFilter: 'women', civilities });
    expect(summarizeIsp(f, 'm')).toMatchObject({ leaders: ['Alpha Test', 'Beta Test'], max: 2 / 6, above_threshold: 0, T: 6 });
    expect(f.every((x) => x.T === 6)).toBe(true);
    expect(summarizeIsp(computeIspFacts(posts, { identityFilter: 'men', civilities }), 'm').leaders).toEqual(['Gamma Test']);
  });
  it('unfiltered maximum unchanged and absent/ambiguous excluded', () => {
    expect(summarizeIsp(computeIspFacts(posts), 'm').leaders).toEqual(['Gamma Test', 'Delta Test']);
    expect(summarizeIsp(computeIspFacts(posts, { identityFilter: 'men' }), 'm').max).toBeNull();
    expect(summarizeIsp(computeIspFacts(posts, { identityFilter: 'ambiguous', civilities }), 'm').max).toBeNull();
  });
  it('homonyms remain uncalculable regardless of civility; no private keys in output', () => {
    const f = computeIspFacts([...posts, { ...posts[0], user_id: 'z' }], { identityFilter: 'women', civilities });
    expect(f.find((x) => x.author_name === 'Alpha Test')?.isp).toBeNull();
    expect(JSON.stringify(f)).not.toMatch(/user_id|civility|email/);
  });
  it('docs stay in sync with declared values and governance', () => {
    for (const path of ['docs/FIC-01_IDENTITE_CIVILITE.md', 'docs/INDICE_DE_SYMPATHIE_POTENTIEL_ISP.md']) {
      const doc = readFileSync(path, 'utf8');
      expect(doc).toContain(`Valeurs canoniques : ${CIVILITIES.map((c) => '`' + c + '`').join(' ; ')}`);
      expect(doc).toContain('filtre avant maximum');
    }
    expect(readFileSync('docs/INDICE_DE_SYMPATHIE_POTENTIEL_ISP.md', 'utf8')).toContain('propriété exclusive de Michel NGWA AYI');
  });
});