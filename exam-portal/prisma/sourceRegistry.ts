/**
 * Source registry seed data — categories A–G plus the user-supplied public
 * aggregator. READ THIS BEFORE TRUSTING ANY ROW:
 *
 *  - URLs are official home pages (or a well-known careers page) whose
 *    *domain* is known from public knowledge. They were NOT fetched when
 *    this file was written: the build environment's network blocks every
 *    government site. `confidence` says how sure the domain is:
 *      high   — long-standing, widely published official domain
 *      medium — official, but the domain has moved before or has a
 *               www/.nic.in/.gov.in variant; check the final URL
 *  - Every row is seeded DISABLED, approvalStatus PENDING, verification
 *    UNVERIFIED. `npm run sources:verify` (run where these sites are
 *    reachable) checks reachability, the final domain, robots.txt and that
 *    notices parse; an admin then approves and enables.
 *  - Deep "recruitment" paths are deliberately not guessed. After a source
 *    is approved, Discover (admin) or `npm run sources:discover` proposes
 *    the recruitment / results / admit-card sections from the site's own
 *    navigation.
 *  - Exams whose site moves every year (GATE, JAM, JEE Advanced, state
 *    TETs) are not seeded: add the current year's URL by hand.
 */

export type Confidence = "high" | "medium";
export type Category = "CENTRAL" | "BANKING" | "RAILWAY" | "STATE" | "DEFENCE" | "EDUCATION" | "OTHER_GOVT" | "AGGREGATOR";

export interface RegistryEntry {
  name: string;
  url: string;
  category: Category;
  group: string;
  state?: string;
  priority: "HIGH" | "NORMAL" | "LOW";
  confidence: Confidence;
  note?: string;
  aggregator?: boolean;
}

type Row = [name: string, url: string, group: string, confidence: Confidence, priority?: "HIGH" | "NORMAL" | "LOW", note?: string];

function rows(category: Category, list: Row[], state?: string): RegistryEntry[] {
  return list.map(([name, url, group, confidence, priority = "NORMAL", note]) => ({ name, url, category, group, confidence, priority, state, note }));
}

// A. Central government
const CENTRAL = rows("CENTRAL", [
  ["Staff Selection Commission (SSC)", "https://ssc.gov.in/", "SSC", "high", "HIGH"],
  ["Union Public Service Commission (UPSC)", "https://upsc.gov.in/", "UPSC", "high", "HIGH", "Observed HTTP 403 for automated requests from the owner's PC; expect BLOCKED — do not work around it."],
  ["National Testing Agency (NTA)", "https://nta.ac.in/", "NTA", "high", "HIGH"],
  ["Employment News / Rozgar Samachar", "https://employmentnews.gov.in/", "Employment News", "high", "NORMAL", "Much content is e-paper/PDF; may need a parser configuration."],
  ["National Career Service", "https://www.ncs.gov.in/", "Central portals", "high", "LOW"],
  ["Department of Personnel & Training (DoPT)", "https://dopt.gov.in/", "Ministries", "high", "LOW"],
  ["Food Corporation of India (FCI)", "https://fci.gov.in/", "PSU", "high"],
  ["ONGC", "https://ongcindia.com/", "PSU", "high"],
  ["Indian Oil Corporation (IOCL)", "https://iocl.com/", "PSU", "high"],
  ["NTPC", "https://www.ntpc.co.in/", "PSU", "high"],
  ["BHEL", "https://www.bhel.com/", "PSU", "high"],
  ["SAIL", "https://www.sail.co.in/", "PSU", "high"],
  ["GAIL", "https://gailonline.com/", "PSU", "high"],
  ["Bharat Electronics (BEL)", "https://bel-india.in/", "PSU", "high"],
  ["Hindustan Aeronautics (HAL)", "https://hal-india.co.in/", "PSU", "high"],
  ["Coal India", "https://www.coalindia.in/", "PSU", "high"],
  ["POWERGRID", "https://www.powergrid.in/", "PSU", "high"],
  ["Airports Authority of India (AAI)", "https://www.aai.aero/", "PSU", "high"],
  ["BSNL", "https://www.bsnl.co.in/", "PSU", "high", "LOW"],
  ["NHPC", "https://www.nhpcindia.com/", "PSU", "high"],
  ["HPCL", "https://www.hindustanpetroleum.com/", "PSU", "high"],
  ["BPCL", "https://www.bharatpetroleum.in/", "PSU", "high"],
  ["NLC India", "https://www.nlcindia.in/", "PSU", "high"],
  ["Oil India", "https://www.oil-india.com/", "PSU", "high"],
  ["DRDO", "https://www.drdo.gov.in/", "Research", "high"],
  ["ISRO", "https://www.isro.gov.in/", "Research", "high"],
  ["CSIR", "https://www.csir.res.in/", "Research", "high"],
  ["ICMR", "https://www.icmr.gov.in/", "Research", "high"],
  ["BARC", "https://www.barc.gov.in/", "Research", "high"],
  ["AIIMS New Delhi", "https://www.aiims.edu/", "Medical", "high"],
  ["ESIC", "https://www.esic.gov.in/", "Medical", "high"],
]);

// B. Banking and financial institutions
const BANKING = rows("BANKING", [
  ["IBPS (incl. IBPS RRB for regional rural banks)", "https://www.ibps.in/", "IBPS", "high", "HIGH", "Owner's PC: curl HTTP 200 but Node fetch failed; the new error messages will show the real cause."],
  ["SBI Careers", "https://sbi.co.in/web/careers", "SBI", "high", "HIGH"],
  ["RBI Opportunities", "https://opportunities.rbi.org.in/", "RBI", "high", "HIGH"],
  ["NABARD", "https://www.nabard.org/", "Financial institutions", "high"],
  ["SIDBI", "https://www.sidbi.in/", "Financial institutions", "high"],
  ["EXIM Bank", "https://www.eximbankindia.in/", "Financial institutions", "high", "LOW"],
  ["National Housing Bank", "https://nhb.org.in/", "Financial institutions", "high", "LOW"],
  ["SEBI", "https://www.sebi.gov.in/", "Financial institutions", "high", "LOW"],
  ["LIC of India", "https://licindia.in/", "Insurance", "high"],
  ["GIC Re", "https://www.gicre.in/", "Insurance", "high", "LOW"],
  ["New India Assurance", "https://www.newindia.co.in/", "Insurance", "high"],
  ["United India Insurance", "https://uiic.co.in/", "Insurance", "high"],
  ["National Insurance Company", "https://nationalinsurance.nic.co.in/", "Insurance", "high"],
  ["Oriental Insurance", "https://orientalinsurance.org.in/", "Insurance", "high"],
  ["Bank of Baroda", "https://www.bankofbaroda.in/", "Public-sector banks", "high"],
  ["Punjab National Bank", "https://www.pnbindia.in/", "Public-sector banks", "high"],
  ["Canara Bank", "https://canarabank.com/", "Public-sector banks", "high"],
  ["Union Bank of India", "https://www.unionbankofindia.co.in/", "Public-sector banks", "high"],
  ["Bank of India", "https://bankofindia.co.in/", "Public-sector banks", "high"],
  ["Indian Bank", "https://www.indianbank.in/", "Public-sector banks", "high"],
  ["Central Bank of India", "https://www.centralbankofindia.co.in/", "Public-sector banks", "high"],
  ["Indian Overseas Bank", "https://www.iob.in/", "Public-sector banks", "high"],
  ["UCO Bank", "https://www.ucobank.com/", "Public-sector banks", "high"],
  ["Bank of Maharashtra", "https://bankofmaharashtra.in/", "Public-sector banks", "high"],
  ["Punjab & Sind Bank", "https://punjabandsindbank.co.in/", "Public-sector banks", "high"],
]);

// C. Railway — every RRB separately; NTPC / Group D / ALP / Technician /
// JE / Paramedical / Ministerial are recruitment *types* published on all
// of them (and rrbapply.gov.in), recognised from notice titles.
const RRB_NOTE = "Each RRB publishes its own copy of CEN notices; duplicates across RRBs are merged by the dedup step.";
const RAILWAY = rows("RAILWAY", [
  ["RRB common application portal", "https://www.rrbapply.gov.in/", "RRB", "high", "HIGH"],
  ["Indian Railways", "https://indianrailways.gov.in/", "Railways", "high", "LOW"],
  ["RRB Ahmedabad", "https://www.rrbahmedabad.gov.in/", "RRB", "high", "NORMAL", RRB_NOTE],
  ["RRB Ajmer", "https://www.rrbajmer.gov.in/", "RRB", "high", "NORMAL", RRB_NOTE],
  ["RRB Prayagraj (Allahabad)", "https://www.rrbald.gov.in/", "RRB", "medium", "NORMAL", RRB_NOTE],
  ["RRB Bengaluru", "https://www.rrbbnc.gov.in/", "RRB", "high", "NORMAL", RRB_NOTE],
  ["RRB Bhopal", "https://www.rrbbpl.nic.in/", "RRB", "medium", "NORMAL", RRB_NOTE],
  ["RRB Bhubaneswar", "https://www.rrbbbs.gov.in/", "RRB", "high", "NORMAL", RRB_NOTE],
  ["RRB Bilaspur", "https://www.rrbbilaspur.gov.in/", "RRB", "high", "NORMAL", RRB_NOTE],
  ["RRB Chandigarh", "https://www.rrbcdg.gov.in/", "RRB", "high", "NORMAL", "Owner's PC: TLS certificate does not match www.rrbcdg.gov.in (SEC_E_WRONG_PRINCIPAL); try https://rrbcdg.gov.in/ — never disable certificate checks."],
  ["RRB Chennai", "https://www.rrbchennai.gov.in/", "RRB", "high", "NORMAL", RRB_NOTE],
  ["RRB Gorakhpur", "https://www.rrbgkp.gov.in/", "RRB", "high", "NORMAL", RRB_NOTE],
  ["RRB Guwahati", "https://www.rrbguwahati.gov.in/", "RRB", "high", "NORMAL", RRB_NOTE],
  ["RRB Jammu-Srinagar", "https://www.rrbjammu.nic.in/", "RRB", "high", "NORMAL", RRB_NOTE],
  ["RRB Kolkata", "https://www.rrbkolkata.gov.in/", "RRB", "high", "NORMAL", RRB_NOTE],
  ["RRB Malda", "https://www.rrbmalda.gov.in/", "RRB", "high", "NORMAL", RRB_NOTE],
  ["RRB Mumbai", "https://www.rrbmumbai.gov.in/", "RRB", "high", "NORMAL", RRB_NOTE],
  ["RRB Muzaffarpur", "https://www.rrbmuzaffarpur.gov.in/", "RRB", "high", "NORMAL", RRB_NOTE],
  ["RRB Patna", "https://www.rrbpatna.gov.in/", "RRB", "high", "NORMAL", RRB_NOTE],
  ["RRB Ranchi", "https://www.rrbranchi.gov.in/", "RRB", "high", "NORMAL", RRB_NOTE],
  ["RRB Secunderabad", "https://www.rrbsecunderabad.gov.in/", "RRB", "medium", "NORMAL", RRB_NOTE],
  ["RRB Siliguri", "https://www.rrbsiliguri.gov.in/", "RRB", "high", "NORMAL", RRB_NOTE],
  ["RRB Thiruvananthapuram", "https://www.rrbthiruvananthapuram.gov.in/", "RRB", "high", "NORMAL", RRB_NOTE],
  ["RRC Northern Railway", "https://www.rrcnr.org/", "RRC", "high", "NORMAL", "Also publishes railway apprentice notices."],
  ["RRC Central Railway", "https://www.rrccr.com/", "RRC", "high", "NORMAL", "Also publishes railway apprentice notices."],
  ["RRC Western Railway", "https://www.rrc-wr.com/", "RRC", "high", "NORMAL", "Also publishes railway apprentice notices."],
  ["RRC North Central Railway", "https://www.rrcpryj.org/", "RRC", "medium"],
  ["RRC Southern Railway", "https://www.rrcmas.in/", "RRC", "medium"],
]);

// E. Defence and uniformed services
const DEFENCE = rows("DEFENCE", [
  ["Indian Army — Join Indian Army", "https://joinindianarmy.nic.in/", "Armed forces", "high", "HIGH"],
  ["Indian Navy — Join Indian Navy", "https://www.joinindiannavy.gov.in/", "Armed forces", "high", "HIGH"],
  ["Indian Air Force — careers", "https://careerindianairforce.cdac.in/", "Armed forces", "high"],
  ["Indian Air Force — Agniveer Vayu", "https://agnipathvayu.cdac.in/", "Armed forces", "high"],
  ["Indian Coast Guard", "https://joinindiancoastguard.cdac.in/", "Armed forces", "high"],
  ["Border Security Force (BSF) recruitment", "https://rectt.bsf.gov.in/", "CAPF", "high"],
  ["Central Reserve Police Force (CRPF) recruitment", "https://rect.crpf.gov.in/", "CAPF", "medium"],
  ["Central Industrial Security Force (CISF) recruitment", "https://cisfrectt.cisf.gov.in/", "CAPF", "high"],
  ["ITBP recruitment", "https://recruitment.itbpolice.nic.in/", "CAPF", "high"],
  ["Sashastra Seema Bal (SSB) recruitment", "https://ssbrectt.gov.in/", "CAPF", "high"],
  ["Assam Rifles", "https://www.assamrifles.gov.in/", "CAPF", "high"],
  ["National Security Guard (NSG)", "https://www.nsg.gov.in/", "CAPF", "high", "LOW", "Recruitment is mostly by deputation; few public notices."],
  ["Ministry of Home Affairs", "https://www.mha.gov.in/", "CAPF", "high", "LOW"],
]);

// F. Education and entrance examinations
const EDUCATION = rows("EDUCATION", [
  ["UGC NET (NTA)", "https://ugcnet.nta.ac.in/", "NTA", "high", "HIGH"],
  ["CSIR NET (NTA)", "https://csirnet.nta.ac.in/", "NTA", "high"],
  ["JEE Main (NTA)", "https://jeemain.nta.ac.in/", "NTA", "high", "HIGH"],
  ["NEET UG (NTA)", "https://neet.nta.nic.in/", "NTA", "high", "HIGH"],
  ["CUET UG (NTA)", "https://cuet.nta.nic.in/", "NTA", "medium"],
  ["CTET (CBSE)", "https://ctet.nic.in/", "Teaching", "high"],
  ["CLAT — Consortium of NLUs", "https://consortiumofnlus.ac.in/", "Entrance", "high"],
  ["JoSAA counselling", "https://josaa.nic.in/", "Counselling", "high", "LOW"],
  ["MCC medical counselling", "https://mcc.nic.in/", "Counselling", "high", "LOW"],
  ["Kendriya Vidyalaya Sangathan", "https://kvsangathan.nic.in/", "Teaching", "high"],
  ["Navodaya Vidyalaya Samiti", "https://navodaya.gov.in/", "Teaching", "high"],
  ["University Grants Commission", "https://www.ugc.gov.in/", "Higher education", "medium", "LOW"],
]);

// G. Other government recruitment
const OTHER = rows("OTHER_GOVT", [
  ["Supreme Court of India", "https://www.sci.gov.in/", "Courts", "high"],
  ["India Post GDS online", "https://indiapostgdsonline.gov.in/", "Postal", "high", "HIGH"],
  ["India Post", "https://www.indiapost.gov.in/", "Postal", "high"],
  ["Apprenticeship India (NAPS)", "https://www.apprenticeshipindia.gov.in/", "Apprenticeships", "high", "LOW"],
  ["NATS — National Apprenticeship Training Scheme", "https://nats.education.gov.in/", "Apprenticeships", "high", "LOW"],
  ["National Scholarship Portal", "https://scholarships.gov.in/", "Scholarships", "high", "LOW", "Scholarship notices are stored in the Scholarships section, separate from jobs."],
]);

// D. State / UT — priority states first (HIGH), then other PSCs.
const STATES: RegistryEntry[] = [
  ...rows("STATE", [
    ["UPPSC — UP Public Service Commission", "https://uppsc.up.nic.in/", "UP Recruitment", "high", "HIGH"],
    ["UPSSSC — UP Subordinate Services Selection Commission", "https://upsssc.gov.in/", "UP Recruitment", "high", "HIGH"],
    ["UP Police Recruitment & Promotion Board", "https://uppbpb.gov.in/", "UP Recruitment", "high", "HIGH"],
    ["Allahabad High Court", "https://www.allahabadhighcourt.in/", "UP Recruitment", "high"],
    ["UPPCL — UP Power Corporation", "https://www.uppcl.org/", "UP Recruitment", "high", "LOW"],
    ["UPSRTC — UP State Road Transport", "https://www.upsrtc.com/", "UP Recruitment", "high", "LOW"],
  ], "UP"),
  ...rows("STATE", [
    ["BPSC — Bihar Public Service Commission", "https://bpsc.bihar.gov.in/", "Bihar Recruitment", "high", "HIGH"],
    ["BSSC — Bihar Staff Selection Commission", "https://bssc.bihar.gov.in/", "Bihar Recruitment", "high", "HIGH"],
    ["CSBC — Central Selection Board of Constable, Bihar", "https://csbc.bihar.gov.in/", "Bihar Recruitment", "high", "HIGH"],
    ["BPSSC — Bihar Police Subordinate Services Commission", "https://bpssc.bihar.gov.in/", "Bihar Recruitment", "high"],
    ["Patna High Court", "https://patnahighcourt.gov.in/", "Bihar Recruitment", "high"],
    ["State Health Society Bihar", "https://shs.bihar.gov.in/", "Bihar Recruitment", "medium", "LOW"],
  ], "BR"),
  ...rows("STATE", [
    ["MPPSC — MP Public Service Commission", "https://mppsc.mp.gov.in/", "MP Recruitment", "high", "HIGH"],
    ["MPESB — MP Employees Selection Board", "https://esb.mp.gov.in/", "MP Recruitment", "high", "HIGH"],
    ["Madhya Pradesh High Court", "https://mphc.gov.in/", "MP Recruitment", "high"],
  ], "MP"),
  ...rows("STATE", [
    ["RPSC — Rajasthan Public Service Commission", "https://rpsc.rajasthan.gov.in/", "Rajasthan Recruitment", "high", "HIGH"],
    ["RSSB — Rajasthan Staff Selection Board", "https://rssb.rajasthan.gov.in/", "Rajasthan Recruitment", "high", "HIGH"],
    ["Rajasthan High Court", "https://hcraj.nic.in/", "Rajasthan Recruitment", "high"],
    ["Rajasthan Police", "https://police.rajasthan.gov.in/", "Rajasthan Recruitment", "high"],
  ], "RJ"),
  ...rows("STATE", [
    ["UKPSC — Uttarakhand Public Service Commission", "https://psc.uk.gov.in/", "Uttarakhand Recruitment", "high", "HIGH"],
    ["UKSSSC — Uttarakhand Subordinate Service Selection Commission", "https://sssc.uk.gov.in/", "Uttarakhand Recruitment", "high", "HIGH"],
    ["High Court of Uttarakhand", "https://highcourtofuttarakhand.gov.in/", "Uttarakhand Recruitment", "high"],
  ], "UT"),
  ...rows("STATE", [
    ["HPSC — Haryana Public Service Commission", "https://hpsc.gov.in/", "Haryana Recruitment", "high", "HIGH"],
    ["HSSC — Haryana Staff Selection Commission", "https://hssc.gov.in/", "Haryana Recruitment", "high", "HIGH"],
    ["Punjab & Haryana High Court", "https://highcourtchd.gov.in/", "Haryana Recruitment", "high", "NORMAL", "Serves Punjab, Haryana and Chandigarh."],
  ], "HR"),
  ...rows("STATE", [
    ["PPSC — Punjab Public Service Commission", "https://ppsc.gov.in/", "Punjab Recruitment", "high", "HIGH"],
    ["PSSSB — Punjab Subordinate Services Selection Board", "https://sssb.punjab.gov.in/", "Punjab Recruitment", "high", "HIGH"],
    ["Punjab Police", "https://www.punjabpolice.gov.in/", "Punjab Recruitment", "high"],
  ], "PB"),
  ...rows("STATE", [
    ["JPSC — Jharkhand Public Service Commission", "https://www.jpsc.gov.in/", "Jharkhand Recruitment", "high", "HIGH"],
    ["JSSC — Jharkhand Staff Selection Commission", "https://jssc.jharkhand.gov.in/", "Jharkhand Recruitment", "medium", "HIGH"],
    ["Jharkhand High Court", "https://jharkhandhighcourt.nic.in/", "Jharkhand Recruitment", "high"],
  ], "JH"),
  ...rows("STATE", [
    ["CGPSC — Chhattisgarh Public Service Commission", "https://psc.cg.gov.in/", "Chhattisgarh Recruitment", "high", "HIGH"],
    ["CG Vyapam — Professional Examination Board", "https://vyapam.cgstate.gov.in/", "Chhattisgarh Recruitment", "high", "HIGH"],
    ["High Court of Chhattisgarh", "https://highcourt.cg.gov.in/", "Chhattisgarh Recruitment", "high"],
  ], "CT"),
  ...rows("STATE", [
    ["DSSSB — Delhi Subordinate Services Selection Board", "https://dsssb.delhi.gov.in/", "Delhi Recruitment", "high", "HIGH"],
    ["Delhi High Court", "https://delhihighcourt.nic.in/", "Delhi Recruitment", "high"],
  ], "DL"),
  ...rows("STATE", [["APPSC — Andhra Pradesh PSC", "https://psc.ap.gov.in/", "State PSC", "high"]], "AP"),
  ...rows("STATE", [["APPSC — Arunachal Pradesh PSC", "https://appsc.gov.in/", "State PSC", "medium", "LOW"]], "AR"),
  ...rows("STATE", [["APSC — Assam PSC", "https://apsc.nic.in/", "State PSC", "high"]], "AS"),
  ...rows("STATE", [["GPSC — Goa PSC", "https://gpsc.goa.gov.in/", "State PSC", "high", "LOW"]], "GA"),
  ...rows("STATE", [
    ["GPSC — Gujarat PSC", "https://gpsc.gujarat.gov.in/", "State PSC", "high"],
    ["GSSSB — Gujarat Subordinate Service Selection Board", "https://gsssb.gujarat.gov.in/", "State SSB", "high"],
  ], "GJ"),
  ...rows("STATE", [["HPPSC — Himachal Pradesh PSC", "https://www.hppsc.hp.gov.in/", "State PSC", "high"]], "HP"),
  ...rows("STATE", [["KPSC — Karnataka PSC", "https://kpsc.kar.nic.in/", "State PSC", "high"]], "KA"),
  ...rows("STATE", [["Kerala PSC", "https://www.keralapsc.gov.in/", "State PSC", "high"]], "KL"),
  ...rows("STATE", [["MPSC — Maharashtra PSC", "https://mpsc.gov.in/", "State PSC", "high"]], "MH"),
  ...rows("STATE", [["Manipur PSC", "https://mpscmanipur.gov.in/", "State PSC", "medium", "LOW"]], "MN"),
  ...rows("STATE", [["Meghalaya PSC", "https://mpsc.nic.in/", "State PSC", "medium", "LOW"]], "ML"),
  ...rows("STATE", [["Mizoram PSC", "https://mpsc.mizoram.gov.in/", "State PSC", "medium", "LOW"]], "MZ"),
  ...rows("STATE", [["NPSC — Nagaland PSC", "https://npsc.nagaland.gov.in/", "State PSC", "medium", "LOW"]], "NL"),
  ...rows("STATE", [
    ["OPSC — Odisha PSC", "https://www.opsc.gov.in/", "State PSC", "high"],
    ["OSSC — Odisha Staff Selection Commission", "https://www.ossc.gov.in/", "State SSB", "high"],
  ], "OR"),
  ...rows("STATE", [["Sikkim PSC", "https://spsc.sikkim.gov.in/", "State PSC", "medium", "LOW"]], "SK"),
  ...rows("STATE", [["TNPSC — Tamil Nadu PSC", "https://www.tnpsc.gov.in/", "State PSC", "high"]], "TN"),
  ...rows("STATE", [["TGPSC — Telangana PSC", "https://www.tspsc.gov.in/", "State PSC", "medium", "NORMAL", "Renamed TSPSC → TGPSC; the domain may redirect — confirm the final URL."]], "TG"),
  ...rows("STATE", [["TPSC — Tripura PSC", "https://tpsc.tripura.gov.in/", "State PSC", "medium", "LOW"]], "TR"),
  ...rows("STATE", [["WBPSC — West Bengal PSC", "https://psc.wb.gov.in/", "State PSC", "medium"]], "WB"),
  ...rows("STATE", [
    ["JKPSC — Jammu & Kashmir PSC", "https://jkpsc.nic.in/", "State PSC", "high"],
    ["JKSSB — J&K Services Selection Board", "https://jkssb.nic.in/", "State SSB", "high"],
  ], "JK"),
];

// Public aggregator — user-provided domain, discovery only.
const AGGREGATOR_NOTE =
  "USER-PROVIDED domain, not verified. '.com.cm' is a Cameroon country-code domain and differs from the long-established sarkariresult.com — confirm which site is intended (no substitution has been made). Before enabling: verify reachability and ownership, read the site's terms of use, and confirm automated access is permitted. Aggregator notices always go to human review and are never treated as the authority for dates, vacancies or eligibility.";
const AGGREGATORS: RegistryEntry[] = [
  { name: "Sarkari Result (aggregator) — home", url: "https://www.sarkariresult.com.cm/", category: "AGGREGATOR", group: "Sarkari Result", priority: "LOW", confidence: "medium", note: AGGREGATOR_NOTE, aggregator: true },
  { name: "Sarkari Result (aggregator) — Latest Jobs", url: "https://www.sarkariresult.com.cm/latest-jobs/", category: "AGGREGATOR", group: "Sarkari Result", priority: "LOW", confidence: "medium", note: AGGREGATOR_NOTE, aggregator: true },
];

export const SOURCE_REGISTRY: RegistryEntry[] = [...CENTRAL, ...BANKING, ...RAILWAY, ...STATES, ...DEFENCE, ...EDUCATION, ...OTHER, ...AGGREGATORS];
