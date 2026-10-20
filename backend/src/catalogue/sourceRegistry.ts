// The registry of candidate free-licence sources for "Did You Know?".
//
// IMPORTANT: everything under `claim` is what we EXPECT a source's terms to
// say. It is stored in the database as an unverified claim. A source becomes
// 'approved' only when the verifier fetches `evidenceUrl` and finds every
// string in `approveMarkers` (and none of `restrictMarkers`) — see
// services/sourceRegistryService.ts. `autoApprove: false` means automation may
// never approve it (mixed or per-item licences): it stays 'pending_review'
// until a person with content:publish decides.
//
// `kind`:
//   content        text/data we may be allowed to reuse; verified from evidence
//   documentation  an API/help page about another registered source: never a
//                  content source, classified 'restricted' (excluded from facts)
//   media          item-specific licences (images, per-record licences): excluded
//                  from fact generation, classified 'restricted'
import type { FactCategoryKey } from './factCategories.js';

export type SourceKind = 'content' | 'documentation' | 'media';

export interface RegistrySource {
  key: string;
  publisher: string;
  title: string;
  url: string;
  group: 'open_data' | 'space' | 'nature' | 'global' | 'india';
  kind: SourceKind;
  topics: FactCategoryKey[];
  endpoint?: string;
  languages: string[];
  connector?: 'wikipedia_summary';
  attributionTemplate?: string;
  claim: {
    licenceName: string;
    licenceUrl: string;
    commercial: boolean | null;
    redistribution: boolean | null;
    attribution: boolean | null;
    shareAlike: boolean | null;
    apiKey: boolean;
    rateLimit: string;
    contentTypes: string[];
  };
  evidenceUrl: string;
  approveMarkers: string[];
  restrictMarkers: string[];
  autoApprove: boolean;
  caveat: string;
}

const NASA_EVIDENCE = 'https://www.nasa.gov/nasa-brand-center/images-and-media/';
const NASA_MARKER = ['not subject to copyright'];
const WD_EVIDENCE = 'https://www.wikidata.org/wiki/Wikidata:Licensing';
const WM_TOU = 'https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use';
const WB_EVIDENCE = 'https://www.worldbank.org/en/about/legal/terms-of-use-for-datasets';

const docs = (parent: string) => `Reference documentation for ${parent}. Not a content source: facts must come from the parent source.`;

export const SOURCE_REGISTRY: RegistrySource[] = [
  // ---- A. Open structured data and encyclopedic resources -----------------
  {
    key: 'wikidata', publisher: 'Wikimedia Foundation', title: 'Wikidata', url: 'https://www.wikidata.org/', group: 'open_data', kind: 'content',
    topics: ['geography', 'india', 'space', 'animals', 'plants', 'inventions'], endpoint: 'https://www.wikidata.org/w/api.php (Special:EntityData/Qxxx.json)', languages: ['en', 'hi'],
    attributionTemplate: 'Data from Wikidata ({pageUrl}), CC0.',
    claim: { licenceName: 'CC0 1.0 Universal', licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', commercial: true, redistribution: true, attribution: false, shareAlike: false, apiKey: false, rateLimit: 'Send a descriptive User-Agent; be polite (a few requests per second at most).', contentTypes: ['structured data', 'labels', 'descriptions'] },
    evidenceUrl: WD_EVIDENCE, approveMarkers: ['CC0'], restrictMarkers: [], autoApprove: true,
    caveat: 'Structured data in the main, Property and Lexeme namespaces is CC0; text in other namespaces differs.',
  },
  {
    key: 'wikidata-query', publisher: 'Wikimedia Foundation', title: 'Wikidata Query Service', url: 'https://query.wikidata.org/', group: 'open_data', kind: 'content',
    topics: ['geography', 'india', 'space', 'animals', 'plants', 'inventions'], endpoint: 'https://query.wikidata.org/sparql', languages: ['en', 'hi'],
    attributionTemplate: 'Data from Wikidata ({pageUrl}), CC0.',
    claim: { licenceName: 'CC0 1.0 Universal', licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', commercial: true, redistribution: true, attribution: false, shareAlike: false, apiKey: false, rateLimit: 'Queries time out after 60 seconds; descriptive User-Agent required; heavy use is throttled.', contentTypes: ['structured data'] },
    evidenceUrl: WD_EVIDENCE, approveMarkers: ['CC0'], restrictMarkers: [], autoApprove: true,
    caveat: 'A query interface to the same CC0 data as Wikidata.',
  },
  {
    key: 'wikidata-data-access', publisher: 'Wikimedia Foundation', title: 'Wikidata data access documentation', url: 'https://www.wikidata.org/wiki/Wikidata:Data_access', group: 'open_data', kind: 'documentation',
    topics: [], languages: ['en'],
    claim: { licenceName: 'Documentation page', licenceUrl: 'https://www.wikidata.org/wiki/Wikidata:Data_access', commercial: null, redistribution: null, attribution: false, shareAlike: false, apiKey: false, rateLimit: 'n/a', contentTypes: [] },
    evidenceUrl: 'https://www.wikidata.org/wiki/Wikidata:Data_access', approveMarkers: [], restrictMarkers: [], autoApprove: false, caveat: docs('Wikidata'),
  },
  {
    key: 'wikipedia-api', publisher: 'Wikimedia Foundation', title: 'Wikipedia API', url: 'https://en.wikipedia.org/w/api.php', group: 'open_data', kind: 'content',
    topics: ['animals', 'plants', 'space', 'inventions', 'maths', 'geography', 'india', 'senses', 'weather', 'oceans', 'technology', 'food', 'arts', 'general', 'mysteries'],
    endpoint: 'https://en.wikipedia.org/api/rest_v1/page/summary/{title} and https://en.wikipedia.org/w/api.php?action=query', languages: ['en', 'hi'], connector: 'wikipedia_summary',
    attributionTemplate: 'Text from Wikipedia, "{title}" ({pageUrl}), licensed CC BY-SA 4.0. Adapted for children.',
    claim: { licenceName: 'CC BY-SA 4.0', licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', commercial: true, redistribution: true, attribution: true, shareAlike: true, apiKey: false, rateLimit: 'Keep to roughly 1 request per second with a descriptive User-Agent; cache responses.', contentTypes: ['text'] },
    evidenceUrl: WM_TOU, approveMarkers: ['Creative Commons Attribution-ShareAlike'], restrictMarkers: [], autoApprove: true,
    caveat: 'Article text is CC BY-SA: attribute the article and licence and keep derivatives under the same licence. Images are item-specific and are not ingested.',
  },
  {
    key: 'mediawiki-rest-docs', publisher: 'Wikimedia Foundation', title: 'MediaWiki REST API documentation', url: 'https://www.mediawiki.org/wiki/API:REST_API', group: 'open_data', kind: 'documentation',
    topics: [], languages: ['en'],
    claim: { licenceName: 'Documentation page', licenceUrl: 'https://www.mediawiki.org/wiki/API:REST_API', commercial: null, redistribution: null, attribution: false, shareAlike: false, apiKey: false, rateLimit: 'n/a', contentTypes: [] },
    evidenceUrl: 'https://www.mediawiki.org/wiki/API:REST_API', approveMarkers: [], restrictMarkers: [], autoApprove: false, caveat: docs('the Wikipedia API'),
  },
  {
    key: 'wikimedia-commons', publisher: 'Wikimedia Foundation', title: 'Wikimedia Commons', url: 'https://commons.wikimedia.org/', group: 'open_data', kind: 'media',
    topics: ['arts', 'geography', 'animals'], languages: ['en'],
    claim: { licenceName: 'Per-file licence (CC0, CC BY, CC BY-SA, public domain)', licenceUrl: 'https://commons.wikimedia.org/wiki/Commons:Licensing', commercial: null, redistribution: null, attribution: true, shareAlike: false, apiKey: false, rateLimit: 'Descriptive User-Agent; be polite.', contentTypes: ['media with per-file licence'] },
    evidenceUrl: 'https://commons.wikimedia.org/wiki/Commons:Licensing', approveMarkers: [], restrictMarkers: [], autoApprove: false,
    caveat: 'Every file carries its own licence and some are not free for commercial use. Not used for fact text; any image must be checked individually.',
  },
  {
    key: 'commons-api-docs', publisher: 'Wikimedia Foundation', title: 'Wikimedia Commons API documentation', url: 'https://commons.wikimedia.org/w/api.php', group: 'open_data', kind: 'documentation',
    topics: [], languages: ['en'],
    claim: { licenceName: 'Documentation page', licenceUrl: 'https://commons.wikimedia.org/w/api.php', commercial: null, redistribution: null, attribution: false, shareAlike: false, apiKey: false, rateLimit: 'n/a', contentTypes: [] },
    evidenceUrl: 'https://commons.wikimedia.org/w/api.php', approveMarkers: [], restrictMarkers: [], autoApprove: false, caveat: docs('Wikimedia Commons'),
  },
  {
    key: 'osm-wiki', publisher: 'OpenStreetMap Foundation', title: 'OpenStreetMap Wiki', url: 'https://wiki.openstreetmap.org/', group: 'open_data', kind: 'content',
    topics: ['geography'], endpoint: 'https://wiki.openstreetmap.org/w/api.php', languages: ['en', 'hi'],
    attributionTemplate: 'Text from the OpenStreetMap Wiki ({pageUrl}), CC BY-SA.',
    claim: { licenceName: 'CC BY-SA (wiki text)', licenceUrl: 'https://wiki.openstreetmap.org/wiki/Wiki_Content_License', commercial: true, redistribution: true, attribution: true, shareAlike: true, apiKey: false, rateLimit: 'Descriptive User-Agent; be polite.', contentTypes: ['text'] },
    evidenceUrl: 'https://wiki.openstreetmap.org/wiki/Wiki_Content_License', approveMarkers: ['Creative Commons', 'ShareAlike'], restrictMarkers: [], autoApprove: true,
    caveat: 'Wiki text only. OpenStreetMap map DATA is a different licence (ODbL) with its own conditions.',
  },
  // ---- B. Space and astronomy ----------------------------------------------
  {
    key: 'nasa-apis', publisher: 'NASA', title: 'NASA APIs', url: 'https://api.nasa.gov/', group: 'space', kind: 'content',
    topics: ['space', 'weather', 'inventions'], endpoint: 'https://api.nasa.gov/ (free API key; DEMO_KEY is heavily limited)', languages: ['en'],
    attributionTemplate: 'Source: NASA ({pageUrl}). NASA does not endorse this app.',
    claim: { licenceName: 'NASA content: generally not subject to copyright (US)', licenceUrl: NASA_EVIDENCE, commercial: true, redistribution: true, attribution: true, shareAlike: false, apiKey: true, rateLimit: 'Per-key hourly limits (DEMO_KEY: 30 requests/hour, 50/day); registered keys 1,000/hour.', contentTypes: ['text', 'data'] },
    evidenceUrl: NASA_EVIDENCE, approveMarkers: NASA_MARKER, restrictMarkers: [], autoApprove: true,
    caveat: 'Some NASA pages contain third-party material with its own copyright; do not imply NASA endorsement.',
  },
  {
    key: 'nasa-science', publisher: 'NASA', title: 'NASA Science', url: 'https://science.nasa.gov/', group: 'space', kind: 'content',
    topics: ['space', 'weather', 'plants'], languages: ['en'],
    attributionTemplate: 'Source: NASA Science ({pageUrl}). NASA does not endorse this app.',
    claim: { licenceName: 'NASA content: generally not subject to copyright (US)', licenceUrl: NASA_EVIDENCE, commercial: true, redistribution: true, attribution: true, shareAlike: false, apiKey: false, rateLimit: 'No API; if scraping is ever needed respect robots.txt and rate limits.', contentTypes: ['text'] },
    evidenceUrl: NASA_EVIDENCE, approveMarkers: NASA_MARKER, restrictMarkers: [], autoApprove: true,
    caveat: 'Third-party material on NASA pages may be copyrighted.',
  },
  {
    key: 'nasa-space-place', publisher: 'NASA', title: 'NASA Space Place', url: 'https://spaceplace.nasa.gov/', group: 'space', kind: 'content',
    topics: ['space', 'weather', 'inventions'], languages: ['en', 'es'],
    attributionTemplate: 'Source: NASA Space Place ({pageUrl}). NASA does not endorse this app.',
    claim: { licenceName: 'NASA content: generally not subject to copyright (US)', licenceUrl: NASA_EVIDENCE, commercial: true, redistribution: true, attribution: true, shareAlike: false, apiKey: false, rateLimit: 'No API.', contentTypes: ['text'] },
    evidenceUrl: NASA_EVIDENCE, approveMarkers: NASA_MARKER, restrictMarkers: [], autoApprove: true,
    caveat: 'Written for children; some illustrations are third-party.',
  },
  {
    key: 'nasa-image-library', publisher: 'NASA', title: 'NASA Image and Video Library', url: 'https://images.nasa.gov/', group: 'space', kind: 'content',
    topics: ['space'], endpoint: 'https://images-api.nasa.gov/search?q=', languages: ['en'],
    attributionTemplate: 'Source: NASA Image and Video Library ({pageUrl}).',
    claim: { licenceName: 'NASA content: generally not subject to copyright (US)', licenceUrl: NASA_EVIDENCE, commercial: true, redistribution: true, attribution: true, shareAlike: false, apiKey: false, rateLimit: 'No key; be polite.', contentTypes: ['metadata text'] },
    evidenceUrl: NASA_EVIDENCE, approveMarkers: NASA_MARKER, restrictMarkers: [], autoApprove: true,
    caveat: 'Only caption/metadata text is in scope. Individual images and videos may carry third-party rights and must be checked per item.',
  },
  {
    key: 'esa', publisher: 'European Space Agency', title: 'European Space Agency', url: 'https://www.esa.int/', group: 'space', kind: 'content',
    topics: ['space', 'inventions'], languages: ['en'],
    attributionTemplate: 'Source: ESA ({pageUrl}), CC BY-SA 3.0 IGO.',
    claim: { licenceName: 'CC BY-SA 3.0 IGO (where stated)', licenceUrl: 'https://creativecommons.org/licenses/by-sa/3.0/igo/', commercial: true, redistribution: true, attribution: true, shareAlike: true, apiKey: false, rateLimit: 'No API.', contentTypes: ['text'] },
    evidenceUrl: 'https://www.esa.int/Services/Terms_and_conditions', approveMarkers: ['CC BY-SA 3.0 IGO'], restrictMarkers: [], autoApprove: true,
    caveat: 'ESA marks third-party and some media as excluded; check each item.',
  },
  // ---- C. Nature, animals, plants, biodiversity ----------------------------
  {
    key: 'inaturalist-api', publisher: 'iNaturalist', title: 'iNaturalist API', url: 'https://api.inaturalist.org/v1/docs/', group: 'nature', kind: 'media',
    topics: ['animals', 'plants'], endpoint: 'https://api.inaturalist.org/v1/', languages: ['en'],
    claim: { licenceName: 'Per-observation licence chosen by each observer', licenceUrl: 'https://www.inaturalist.org/pages/terms', commercial: null, redistribution: null, attribution: true, shareAlike: false, apiKey: false, rateLimit: 'About 60 requests/minute; 10,000/day suggested.', contentTypes: ['observations with per-record licence'] },
    evidenceUrl: 'https://www.inaturalist.org/pages/terms', approveMarkers: [], restrictMarkers: [], autoApprove: false,
    caveat: 'Observation text and photos carry individual licences, many non-commercial. Excluded from fact generation.',
  },
  {
    key: 'inaturalist', publisher: 'iNaturalist', title: 'iNaturalist', url: 'https://www.inaturalist.org/', group: 'nature', kind: 'media',
    topics: ['animals', 'plants'], languages: ['en', 'hi'],
    claim: { licenceName: 'Per-observation licence chosen by each observer', licenceUrl: 'https://www.inaturalist.org/pages/terms', commercial: null, redistribution: null, attribution: true, shareAlike: false, apiKey: false, rateLimit: 'See API entry.', contentTypes: ['observations with per-record licence'] },
    evidenceUrl: 'https://www.inaturalist.org/pages/terms', approveMarkers: [], restrictMarkers: [], autoApprove: false,
    caveat: 'Same as the API entry: per-record licences, excluded from fact generation.',
  },
  {
    key: 'powo', publisher: 'Royal Botanic Gardens, Kew', title: 'Plants of the World Online', url: 'https://powo.science.kew.org/', group: 'nature', kind: 'content',
    topics: ['plants'], endpoint: 'https://powo.science.kew.org/api/2/', languages: ['en'],
    claim: { licenceName: 'To be confirmed from POWO terms', licenceUrl: 'https://powo.science.kew.org/about', commercial: null, redistribution: null, attribution: true, shareAlike: false, apiKey: false, rateLimit: 'Unspecified; be polite.', contentTypes: ['plant data'] },
    evidenceUrl: 'https://powo.science.kew.org/about', approveMarkers: ['Creative Commons'], restrictMarkers: ['NonCommercial'], autoApprove: false,
    caveat: 'Licence version and commercial permission must be confirmed by a person before any use.',
  },
  {
    key: 'gbif', publisher: 'Global Biodiversity Information Facility', title: 'Global Biodiversity Information Facility', url: 'https://www.gbif.org/', group: 'nature', kind: 'content',
    topics: ['animals', 'plants', 'oceans'], endpoint: 'https://api.gbif.org/v1/', languages: ['en'],
    attributionTemplate: 'Data from GBIF ({pageUrl}); dataset licence applies.',
    claim: { licenceName: 'Per-dataset licence (CC0, CC BY or CC BY-NC)', licenceUrl: 'https://www.gbif.org/terms/data-user', commercial: null, redistribution: null, attribution: true, shareAlike: false, apiKey: false, rateLimit: 'Search API paging limits; be polite.', contentTypes: ['occurrence data per dataset licence'] },
    evidenceUrl: 'https://www.gbif.org/terms/data-user', approveMarkers: ['CC0', 'CC BY'], restrictMarkers: [], autoApprove: false,
    caveat: 'Each dataset sets its own licence; only CC0/CC BY datasets could be used and the filter must be applied per dataset.',
  },
  {
    key: 'gbif-api-docs', publisher: 'Global Biodiversity Information Facility', title: 'GBIF API documentation', url: 'https://techdocs.gbif.org/en/openapi/', group: 'nature', kind: 'documentation',
    topics: [], languages: ['en'],
    claim: { licenceName: 'Documentation page', licenceUrl: 'https://techdocs.gbif.org/en/openapi/', commercial: null, redistribution: null, attribution: false, shareAlike: false, apiKey: false, rateLimit: 'n/a', contentTypes: [] },
    evidenceUrl: 'https://techdocs.gbif.org/en/openapi/', approveMarkers: [], restrictMarkers: [], autoApprove: false, caveat: docs('GBIF'),
  },
  {
    key: 'noaa-ocean', publisher: 'NOAA National Ocean Service', title: 'NOAA Ocean Service', url: 'https://oceanservice.noaa.gov/', group: 'nature', kind: 'content',
    topics: ['oceans', 'weather', 'geography'], languages: ['en'],
    attributionTemplate: 'Source: NOAA National Ocean Service ({pageUrl}).',
    claim: { licenceName: 'US Government work, public information', licenceUrl: 'https://www.noaa.gov/disclaimer', commercial: true, redistribution: true, attribution: false, shareAlike: false, apiKey: false, rateLimit: 'No API.', contentTypes: ['text'] },
    evidenceUrl: 'https://www.noaa.gov/disclaimer', approveMarkers: ['public information and may be distributed or copied'], restrictMarkers: [], autoApprove: true,
    caveat: 'NOAA asks for credit; third-party items on NOAA pages may be copyrighted.',
  },
  {
    key: 'usgs', publisher: 'U.S. Geological Survey', title: 'USGS', url: 'https://www.usgs.gov/', group: 'nature', kind: 'content',
    topics: ['geography', 'weather', 'oceans'], languages: ['en'],
    attributionTemplate: 'Source: U.S. Geological Survey ({pageUrl}).',
    claim: { licenceName: 'US Government work, public domain (unless noted)', licenceUrl: 'https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits', commercial: true, redistribution: true, attribution: true, shareAlike: false, apiKey: false, rateLimit: 'No API.', contentTypes: ['text', 'data'] },
    evidenceUrl: 'https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits', approveMarkers: ['public domain'], restrictMarkers: [], autoApprove: true,
    caveat: 'Pages credit third-party material separately; credit USGS as the source.',
  },
  // ---- D. Climate, geography, global statistics ----------------------------
  {
    key: 'owid', publisher: 'Our World in Data', title: 'Our World in Data', url: 'https://ourworldindata.org/', group: 'global', kind: 'content',
    topics: ['weather', 'geography', 'senses', 'maths'], languages: ['en'],
    attributionTemplate: 'Source: Our World in Data ({pageUrl}), CC BY 4.0, and the underlying data providers it names.',
    claim: { licenceName: 'CC BY 4.0 (own work); third-party data under its provider\'s licence', licenceUrl: 'https://ourworldindata.org/faqs', commercial: true, redistribution: true, attribution: true, shareAlike: false, apiKey: false, rateLimit: 'Be polite.', contentTypes: ['text', 'charts', 'data (per indicator licence)'] },
    evidenceUrl: 'https://ourworldindata.org/faqs', approveMarkers: ['CC BY'], restrictMarkers: [], autoApprove: false,
    caveat: 'Many indicators come from third parties with different licences; a person must confirm each indicator before use.',
  },
  {
    key: 'owid-data-access', publisher: 'Our World in Data', title: 'Our World in Data API and data access', url: 'https://ourworldindata.org/how-to-use-our-world-in-data', group: 'global', kind: 'documentation',
    topics: [], languages: ['en'],
    claim: { licenceName: 'Documentation page', licenceUrl: 'https://ourworldindata.org/how-to-use-our-world-in-data', commercial: null, redistribution: null, attribution: false, shareAlike: false, apiKey: false, rateLimit: 'n/a', contentTypes: [] },
    evidenceUrl: 'https://ourworldindata.org/how-to-use-our-world-in-data', approveMarkers: [], restrictMarkers: [], autoApprove: false, caveat: docs('Our World in Data'),
  },
  {
    key: 'world-bank', publisher: 'The World Bank', title: 'World Bank Open Data', url: 'https://data.worldbank.org/', group: 'global', kind: 'content',
    topics: ['geography', 'maths', 'weather'], endpoint: 'https://api.worldbank.org/v2/', languages: ['en'],
    attributionTemplate: 'Source: The World Bank, World Bank Open Data ({pageUrl}), CC BY 4.0.',
    claim: { licenceName: 'CC BY 4.0 (most datasets)', licenceUrl: 'https://creativecommons.org/licenses/by/4.0/', commercial: true, redistribution: true, attribution: true, shareAlike: false, apiKey: false, rateLimit: 'No key; be polite.', contentTypes: ['statistical data'] },
    evidenceUrl: WB_EVIDENCE, approveMarkers: ['CC BY 4.0'], restrictMarkers: [], autoApprove: true,
    caveat: 'A few datasets are excluded or carry third-party terms; the terms page lists exceptions.',
  },
  {
    key: 'world-bank-api-docs', publisher: 'The World Bank', title: 'World Bank API documentation', url: 'https://datahelpdesk.worldbank.org/knowledgebase/topics/125589-developer-information', group: 'global', kind: 'documentation',
    topics: [], languages: ['en'],
    claim: { licenceName: 'Documentation page', licenceUrl: 'https://datahelpdesk.worldbank.org/knowledgebase/topics/125589-developer-information', commercial: null, redistribution: null, attribution: false, shareAlike: false, apiKey: false, rateLimit: 'n/a', contentTypes: [] },
    evidenceUrl: 'https://datahelpdesk.worldbank.org/knowledgebase/topics/125589-developer-information', approveMarkers: [], restrictMarkers: [], autoApprove: false, caveat: docs('World Bank Open Data'),
  },
  {
    key: 'who', publisher: 'World Health Organization', title: 'World Health Organization', url: 'https://www.who.int/', group: 'global', kind: 'content',
    topics: ['senses', 'food'], languages: ['en', 'hi'],
    claim: { licenceName: 'CC BY-NC-SA 3.0 IGO (non-commercial)', licenceUrl: 'https://creativecommons.org/licenses/by-nc-sa/3.0/igo/', commercial: false, redistribution: true, attribution: true, shareAlike: true, apiKey: false, rateLimit: 'No API for text.', contentTypes: ['text (non-commercial only)'] },
    evidenceUrl: 'https://www.who.int/about/policies/publishing/copyright', approveMarkers: ['Creative Commons'], restrictMarkers: ['NonCommercial'], autoApprove: false,
    caveat: 'WHO licenses text for non-commercial use; LoJi is a paid service, so WHO text must not be reproduced. Facts may only link to WHO as a reference.',
  },
  {
    key: 'un', publisher: 'United Nations', title: 'United Nations', url: 'https://www.un.org/', group: 'global', kind: 'content',
    topics: ['geography', 'general'], languages: ['en', 'hi'],
    claim: { licenceName: 'UN website terms of use (permission may be required)', licenceUrl: 'https://www.un.org/en/about-us/terms-of-use', commercial: null, redistribution: null, attribution: true, shareAlike: false, apiKey: false, rateLimit: 'No API.', contentTypes: ['text'] },
    evidenceUrl: 'https://www.un.org/en/about-us/terms-of-use', approveMarkers: [], restrictMarkers: [], autoApprove: false,
    caveat: 'Terms are restrictive for commercial reuse; needs a person to decide.',
  },
  {
    key: 'unesco', publisher: 'UNESCO', title: 'UNESCO', url: 'https://www.unesco.org/', group: 'global', kind: 'content',
    topics: ['india', 'ancient', 'arts', 'geography'], languages: ['en', 'hi'],
    claim: { licenceName: 'CC BY-SA 3.0 IGO for UNESCO-owned content; other items vary', licenceUrl: 'https://www.unesco.org/en/open-access', commercial: true, redistribution: true, attribution: true, shareAlike: true, apiKey: false, rateLimit: 'No API.', contentTypes: ['text (UNESCO-owned only)'] },
    evidenceUrl: 'https://www.unesco.org/en/open-access', approveMarkers: ['CC BY-SA 3.0 IGO'], restrictMarkers: [], autoApprove: false,
    caveat: 'Mixed ownership (World Heritage descriptions are partly third-party); needs a person to confirm per section.',
  },
  // ---- E. India-specific ---------------------------------------------------
  {
    key: 'isro', publisher: 'Indian Space Research Organisation', title: 'Indian Space Research Organisation', url: 'https://www.isro.gov.in/', group: 'india', kind: 'content',
    topics: ['space', 'india', 'technology'], languages: ['en', 'hi'],
    claim: { licenceName: 'ISRO website content policy (permission terms to be confirmed)', licenceUrl: 'https://www.isro.gov.in/', commercial: null, redistribution: null, attribution: true, shareAlike: false, apiKey: false, rateLimit: 'No API.', contentTypes: ['text'] },
    evidenceUrl: 'https://www.isro.gov.in/', approveMarkers: [], restrictMarkers: [], autoApprove: false,
    caveat: 'No machine-confirmable open licence is known; needs a person to read the content policy or obtain permission.',
  },
  {
    key: 'ncert', publisher: 'NCERT', title: 'NCERT', url: 'https://ncert.nic.in/', group: 'india', kind: 'content',
    topics: ['maths', 'inventions', 'india', 'geography', 'senses'], languages: ['en', 'hi'],
    claim: { licenceName: 'NCERT copyright notice (free to read; reproduction needs permission)', licenceUrl: 'https://ncert.nic.in/', commercial: false, redistribution: false, attribution: true, shareAlike: false, apiKey: false, rateLimit: 'No API.', contentTypes: ['textbooks (read only)'] },
    evidenceUrl: 'https://ncert.nic.in/', approveMarkers: [], restrictMarkers: ['written permission', 'prior permission'], autoApprove: false,
    caveat: 'Textbooks are free to read, not free to reproduce. Use only as a curriculum guide for topic selection, never as a text source.',
  },
  {
    key: 'india-gov', publisher: 'Government of India', title: 'National Portal of India', url: 'https://www.india.gov.in/', group: 'india', kind: 'content',
    topics: ['india', 'geography', 'general'], languages: ['en', 'hi'],
    claim: { licenceName: 'Website policy: reproduction permitted accurately and in context (to be confirmed)', licenceUrl: 'https://www.india.gov.in/website-policies', commercial: null, redistribution: null, attribution: true, shareAlike: false, apiKey: false, rateLimit: 'No API (open data is on data.gov.in under GODL-India).', contentTypes: ['text'] },
    evidenceUrl: 'https://www.india.gov.in/website-policies', approveMarkers: ['reproduced'], restrictMarkers: [], autoApprove: false,
    caveat: 'Content owned by individual ministries may differ; needs a person to confirm.',
  },
  {
    key: 'know-india', publisher: 'Government of India', title: 'Know India', url: 'https://knowindia.india.gov.in/', group: 'india', kind: 'content',
    topics: ['india', 'geography', 'ancient', 'arts'], languages: ['en', 'hi'],
    claim: { licenceName: 'National Portal website policy (to be confirmed)', licenceUrl: 'https://www.india.gov.in/website-policies', commercial: null, redistribution: null, attribution: true, shareAlike: false, apiKey: false, rateLimit: 'No API.', contentTypes: ['text'] },
    evidenceUrl: 'https://www.india.gov.in/website-policies', approveMarkers: ['reproduced'], restrictMarkers: [], autoApprove: false,
    caveat: 'Hosted on the National Portal; treat like the portal until confirmed.',
  },
  {
    key: 'rbi', publisher: 'Reserve Bank of India', title: 'Reserve Bank of India', url: 'https://www.rbi.org.in/', group: 'india', kind: 'content',
    topics: ['india', 'maths'], languages: ['en', 'hi'],
    claim: { licenceName: 'RBI copyright policy (reproduction conditions to be confirmed)', licenceUrl: 'https://www.rbi.org.in/', commercial: null, redistribution: null, attribution: true, shareAlike: false, apiKey: false, rateLimit: 'No API for text.', contentTypes: ['text'] },
    evidenceUrl: 'https://www.rbi.org.in/', approveMarkers: [], restrictMarkers: [], autoApprove: false,
    caveat: 'No open licence confirmed; needs a person to read the copyright policy.',
  },
  {
    key: 'fao', publisher: 'Food and Agriculture Organization of the United Nations', title: 'Food and Agriculture Organization', url: 'https://www.fao.org/', group: 'india', kind: 'content',
    topics: ['food', 'plants', 'weather'], languages: ['en', 'hi'],
    attributionTemplate: 'Source: FAO ({pageUrl}).',
    claim: { licenceName: 'FAO terms (CC BY-NC-SA 3.0 IGO for much content; some CC BY 4.0)', licenceUrl: 'https://www.fao.org/contact-us/terms/en/', commercial: null, redistribution: true, attribution: true, shareAlike: null, apiKey: false, rateLimit: 'FAOSTAT has an API; be polite.', contentTypes: ['text', 'statistical data'] },
    evidenceUrl: 'https://www.fao.org/contact-us/terms/en/', approveMarkers: ['CC BY'], restrictMarkers: ['NonCommercial', 'CC BY-NC'], autoApprove: false,
    caveat: 'Licences differ by publication; non-commercial terms apply to much text. Needs a person to confirm.',
  },
];
