const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Database path resolution
let dbPath;
if (process.env.DATABASE_PATH) {
  dbPath = process.env.DATABASE_PATH;
} else if (fs.existsSync('/data')) {
  dbPath = '/data/intel.db';
} else {
  fs.mkdirSync('./data', { recursive: true });
  dbPath = './data/intel.db';
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Schema migration using PRAGMA user_version
const version = db.pragma('user_version', { simple: true });

if (version < 1) {
  const migrate = db.transaction(() => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sector TEXT NOT NULL DEFAULT '',
        hq TEXT NOT NULL DEFAULT '',
        revenue TEXT NOT NULL DEFAULT '',
        employees TEXT NOT NULL DEFAULT '',
        context TEXT NOT NULL DEFAULT '',
        dot_color TEXT NOT NULL DEFAULT '#3B82F6',
        display_revenue TEXT NOT NULL DEFAULT '',
        is_deleted INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (account_id) REFERENCES accounts(id)
      );

      CREATE INDEX IF NOT EXISTS idx_chat_account ON chat_messages(account_id);
      PRAGMA user_version = 1;
    `);
  });
  migrate();
}

if (version < 2) {
  const migrate2 = db.transaction(() => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id TEXT NOT NULL,
        name TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT '',
        role TEXT NOT NULL DEFAULT '',
        influence TEXT NOT NULL CHECK(influence IN ('Champion', 'Evaluator', 'Blocker')),
        email TEXT NOT NULL DEFAULT '',
        linkedin TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '',
        ai_rationale TEXT,
        warm_path TEXT,
        researched_at TEXT,
        is_deleted INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (account_id) REFERENCES accounts(id)
      );

      CREATE INDEX IF NOT EXISTS idx_contacts_account ON contacts(account_id);

      CREATE TABLE IF NOT EXISTS outreach_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contact_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        channel TEXT NOT NULL CHECK(channel IN ('email', 'linkedin', 'phone', 'meeting', 'other')),
        outcome TEXT NOT NULL CHECK(outcome IN ('connected', 'no response', 'declined', 'meeting scheduled')),
        notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (contact_id) REFERENCES contacts(id)
      );

      CREATE INDEX IF NOT EXISTS idx_outreach_contact ON outreach_log(contact_id);
      PRAGMA user_version = 2;
    `);
  });
  migrate2();
}

if (version < 3) {
  const migrate3 = db.transaction(() => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS activity_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('meeting', 'call', 'email', 'note', 'other')),
        participants TEXT NOT NULL DEFAULT '',
        summary TEXT NOT NULL,
        linked_contacts TEXT,
        source TEXT NOT NULL DEFAULT 'manual' CHECK(source IN ('manual', 'ai_debrief')),
        ai_raw TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (account_id) REFERENCES accounts(id)
      );
      CREATE INDEX IF NOT EXISTS idx_activity_account ON activity_log(account_id);
      PRAGMA user_version = 3;
    `);
  });
  migrate3();
}

if (version < 4) {
  const migrate4 = db.transaction(() => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS private_intel (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (account_id) REFERENCES accounts(id)
      );
      CREATE INDEX IF NOT EXISTS idx_intel_account ON private_intel(account_id);

      CREATE TABLE IF NOT EXISTS strategy_summaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id TEXT NOT NULL UNIQUE,
        content TEXT NOT NULL,
        is_edited INTEGER NOT NULL DEFAULT 0,
        generated_at TEXT NOT NULL DEFAULT (datetime('now')),
        edited_at TEXT,
        FOREIGN KEY (account_id) REFERENCES accounts(id)
      );

      CREATE TABLE IF NOT EXISTS buying_triggers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id TEXT NOT NULL,
        tag TEXT NOT NULL,
        category TEXT NOT NULL,
        notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (account_id) REFERENCES accounts(id)
      );
      CREATE INDEX IF NOT EXISTS idx_triggers_account ON buying_triggers(account_id);
      PRAGMA user_version = 4;
    `);
  });
  migrate4();
}

if (version < 5) {
  const migrate5 = db.transaction(() => {
    db.exec(`
      ALTER TABLE accounts ADD COLUMN last_refreshed_at TEXT;

      CREATE TABLE IF NOT EXISTS refresh_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id TEXT NOT NULL,
        tokens_used INTEGER NOT NULL DEFAULT 0,
        refresh_type TEXT NOT NULL CHECK(refresh_type IN ('auto', 'manual')),
        changes_summary TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (account_id) REFERENCES accounts(id)
      );
      CREATE INDEX IF NOT EXISTS idx_refresh_log_account ON refresh_log(account_id);

      CREATE TABLE IF NOT EXISTS refresh_budget (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        period TEXT UNIQUE NOT NULL,
        tokens_used INTEGER NOT NULL DEFAULT 0,
        budget_limit INTEGER NOT NULL DEFAULT 500000,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      PRAGMA user_version = 5;
    `);
  });
  migrate5();
}

if (version < 6) {
  const migrate6 = db.transaction(() => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS briefings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id TEXT NOT NULL UNIQUE,
        content TEXT NOT NULL,
        generated_at TEXT NOT NULL DEFAULT (datetime('now')),
        tokens_used INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (account_id) REFERENCES accounts(id)
      );
      PRAGMA user_version = 6;
    `);
  });
  migrate6();
}

// Seed data
const count = db.prepare('SELECT COUNT(*) AS cnt FROM accounts').get().cnt;

if (count === 0) {
  const SEED_ACCOUNTS = [
    {
      id: 'gm',
      name: 'General Motors Company',
      sector: 'Automotive OEM',
      hq: 'Detroit, Michigan',
      revenue: '$187.4B (FY2024)',
      employees: '~163,000',
      context: 'General Motors (NYSE: GM) is the largest US automaker. FY2024 revenue: $187.4B (+9.1% YoY), record net income of $14.9B. ICT spend: $10.9B. R&D: $9.2B (5.4% of revenue). CEO: Mary T. Barra. CIO: Fred Killeen (reports to Barra). CTO: Gil Golan. CDO: Edward Kummer. Software & Services SVP: Sterling Anderson (new Nov 2025, ex-Tesla). Head of AI Research: John Anderson (new Jul 2025, ex-Google 14 years). CISO: Michael Hanley (new Dec 2024, ex-GitHub CTO). Software org was restructured Q4 2025 following Cruise robotaxi shutdown (Dec 2024) and departure of Dave Richardson. This is a vendor relationship reset moment. Technology: Microsoft Azure (primary dev cloud, Dev Box), Google Cloud (AI/ML, OnStar IVA, Dialogflow), NVIDIA (vehicle + manufacturing AI, expanded 2025 partnership), Snowflake (major data migration), Azure Databricks, SAP, ServiceNow, Siemens Teamcenter, GitHub Copilot. Outsourcing providers: HCL (22% est., dominant in product support), Cognizant (19%, leads data engineering), Infosys (16%, leads BI/analytics), Capgemini, Accenture. Grid Dynamics differentiators: AI-native delivery vs commodity SIs, Google Cloud partnership directly relevant, Ford account relationship provides automotive AI credibility, Dave Zabihaylo is based in Detroit with direct access. Key entry points: AI Observability/MLOps for Google Cloud + NVIDIA workloads, Snowflake data engineering modernization, Software-Defined Vehicle platform engineering under Sterling Anderson.',
      dot_color: '#0170CE',
      display_revenue: '$187B'
    },
    {
      id: 'mercedes',
      name: 'Mercedes-Benz Group AG',
      sector: 'Premium OEM',
      hq: 'Stuttgart, Germany',
      revenue: '$160B',
      employees: '~167,000',
      context: 'Mercedes-Benz Group AG (DAX: MBG) reported FY2024 revenue of approximately $160B (EUR 145.6B), down from $166B in 2023, primarily due to China volume decline and pricing pressure. R&D spend: $7.6B. Key strategic program: MB.OS, a proprietary vehicle operating system being built to consolidate all vehicle software. Technology: Microsoft Azure (primary), AWS, NVIDIA DRIVE, Qualcomm Snapdragon, Azure OpenAI for MBUX AI assistant. VP Digital & IT: Sabine Scheunert. Key opportunity: MB.OS software engineering, AI integration into MBUX, supply chain AI, digital manufacturing.',
      dot_color: '#94A3B8',
      display_revenue: '$160B'
    },
    {
      id: 'volvo',
      name: 'Volvo Group (AB Volvo)',
      sector: 'OEM - Commercial Vehicles',
      hq: 'Gothenburg, Sweden',
      revenue: '$49.6B (FY2024)',
      employees: '~100,000',
      context: 'Volvo Group (Nasdaq Stockholm: VOLV) manufactures trucks, buses, and construction equipment. FY2024 revenue: SEK 526.8B (~$49.6B), down 4.4% as freight market normalized. CEO: Martin Lundstedt. Divisions: Volvo Trucks, Mack Trucks, Renault Trucks, Volvo Buses (includes Nova Bus), Volvo Construction Equipment, Volvo Financial Services. IMPORTANT: Grid Dynamics already has an active Nova Bus (a Volvo Group subsidiary) relationship - this is a direct, existing warm path into the broader Volvo Group account. Technology: Azure, AWS, Volvo Connect fleet platform, remote diagnostics, SAP, Dynafleet. Key opportunities: EV truck fleet analytics, autonomous trucking software, predictive maintenance AI, leveraging Nova Bus relationship to expand account.',
      dot_color: '#3B82F6',
      display_revenue: '$50B'
    },
    {
      id: 'rivian',
      name: 'Rivian Automotive',
      sector: 'EV OEM',
      hq: 'Irvine, CA / Normal, IL (manufacturing)',
      revenue: '$4.97B (FY2024)',
      employees: '~14,000',
      context: 'Rivian (Nasdaq: RIVN) is a software-first EV startup. FY2024 revenue: $4.97B (+12% YoY). Net loss: -$4.75B (improving). CEO: RJ Scaringe (founder). Key partnerships: Amazon (commercial vans), Volkswagen JV ($1B+ convertible note, SDV platform licensing). Products: R1T truck, R1S SUV, commercial delivery van. Technology: Rivian OS (proprietary), AWS, Snowflake, NVIDIA DRIVE, OTA platform, zonal architecture. Key milestone: VW JV validates Rivian\'s SDV platform as licensable to other OEMs. Key opportunities: SDV platform engineering scale for VW licensing, fleet data analytics (Amazon contract), AI personalization, OTA update platform engineering. Grid Dynamics AI and cloud engineering expertise aligns with Rivian\'s software-first architecture.',
      dot_color: '#22C55E',
      display_revenue: '$4.97B'
    },
    {
      id: 'mahle',
      name: 'MAHLE GmbH',
      sector: 'Automotive Tier 1',
      hq: 'Stuttgart, Germany',
      revenue: '$12.6B',
      employees: '~64,000',
      context: 'MAHLE is a German automotive Tier 1 supplier focused on electrification, thermal management, filtration, and engine components. FY2024 revenue declined 5.6% organically. They cut ~4,700 employees. Moody\'s Ba2 negative rating. Key strategic focus: EV components, battery thermal management, hydrogen fuel cells. They acquired full BHTC thermal management control (Jan 2025). 28 North American production sites (Marne, MI area). Key opportunity for Grid Dynamics: manufacturing AI efficiency, M&A integration data work, EV platform data engineering.',
      dot_color: '#F59E0B',
      display_revenue: '$12.6B'
    },
    {
      id: 'magna',
      name: 'Magna International',
      sector: 'Automotive Tier 1',
      hq: 'Aurora, ON / Troy, MI (US)',
      revenue: '$42.8B',
      employees: '~179,000',
      context: 'Magna International is one of the world\'s largest automotive Tier 1 suppliers. NYSE: MGA. CEO Swamy Kotagiri has made software-defined vehicle (SDV) capabilities a strategic priority. US HQ in Troy, MI. 342 manufacturing operations, 104 R&D centers, 28 countries. Key segments: Body & Chassis, Power & Vision, Seating, Complete Vehicles, ADAS/Autonomy, Electrification. Technology: SAP, AWS, Azure, Snowflake, AUTOSAR, ROS2. Key opportunity: ADAS software engineering, SDV platform development, digital manufacturing AI.',
      dot_color: '#3B82F6',
      display_revenue: '$42.8B'
    },
    {
      id: 'forvia',
      name: 'Forvia SE',
      sector: 'Automotive Tier 1',
      hq: 'Nanterre, France / Auburn Hills, MI (NA)',
      revenue: '$29.8B',
      employees: '~150,000',
      context: 'Forvia SE (Euronext: FRVIA) was formed in 2022 through the merger of Faurecia and HELLA. FY2024 revenue: EUR 27B (~$29.8B). 150,000 employees, 290+ industrial sites, 76 R&D centers. North America HQ: Auburn Hills, Michigan with 43 sites and 7 R&D centers. CEO: Martin Fischer. Strategic platform: Appning (in-car connectivity). Segments: Seating, Interiors, Clean Mobility, Electronics, Lighting, Lifecycle Solutions. Active EU-FORWARD headcount reduction (10,000 over 5 years). Net debt EUR 6.6B. Key opportunity: Faurecia+HELLA integration data work, Appning platform software engineering, AI quality systems, manufacturing efficiency AI.',
      dot_color: '#14B8A6',
      display_revenue: '$29.8B'
    },
    {
      id: 'bosch',
      name: 'Robert Bosch GmbH',
      sector: 'Technology & Automotive Supplier',
      hq: 'Gerlingen, Germany / Farmington Hills, MI (NA)',
      revenue: '$99.7B',
      employees: '~417,900',
      context: 'Bosch is the largest Tier 1 / technology supplier globally. FY2024 revenue: EUR 90.3B (~$99.7B). R&D: EUR 7.8B. 86,800 R&D associates. CEO: Stefan Hartung. Four sectors: Mobility (61%), Consumer Goods (22%), Energy & Building (9%), Industrial (8%). Key AI initiatives: Vehicle Motion Management AI, brake-by-wire systems, manufacturing AI, sensor fusion. Projects $6B+ in software and services revenue by early 2030s. North America HQ in Farmington Hills, MI. Technology: Azure, AWS, SAP, AUTOSAR, IoT platform (proprietary). Key opportunity: AI sensor integration, manufacturing AI/digital twin, software services growth support.',
      dot_color: '#EF4444',
      display_revenue: '$99.7B'
    },
    {
      id: 'harman',
      name: 'HARMAN International',
      sector: 'Connected Technology (Samsung subsidiary)',
      hq: 'Stamford, CT / Novi, MI (automotive)',
      revenue: '$11B (peak)',
      employees: '~30,000',
      context: 'HARMAN International is a wholly-owned Samsung subsidiary (acquired 2017 for $8B). Revenue grew to $11B under Michael Mauser. $45B automotive backlog in awarded business. New CEO: Christian Sobottka (April 2025, replaced Mauser). 30,000 employees. Key products: Digital cockpit, connected car systems, HARMAN Ignite (cloud platform), infotainment, audio (JBL, Harman Kardon, AKG). Technology: HARMAN Ignite, Samsung SmartThings, Android Automotive, QNX, OTA update systems. Active in generative AI for cockpit. Key opportunity: digital cockpit AI engineering, voice AI, connected car data platform, generative AI in-vehicle personalization. Samsung backing provides strong R&D investment capacity.',
      dot_color: '#A78BFA',
      display_revenue: '$11B'
    },
    {
      id: 'dms',
      name: 'Detroit Manufacturing Systems (now Voltava)',
      sector: 'Automotive Tier 1 / Contract Manufacturing',
      hq: 'Detroit, Michigan',
      revenue: '~$600M+ (post-merger est.)',
      employees: '~2,500+',
      context: 'Detroit Manufacturing Systems (DMS) was founded in 2012 as a JV between Rush Group and Faurecia. In January 2026, DMS merged with Android Industries and Avancez to form Voltava, with $160M in senior secured financing. CEO Bruce Smith. Products: instrument panels, interior trim components, injection molding, value-add assembly. Key customers: Ford, Volvo. 88% minority workforce, 60%+ Detroit residents. Community-focused culture. Grid Dynamics has an existing Ford relationship that provides a warm reference into DMS. Also, DMS makes products for Volvo, and Grid Dynamics has a Nova Bus (Volvo subsidiary) relationship. Key opportunity: Voltava integration data/IT work, manufacturing analytics, Ford-adjacent positioning.',
      dot_color: '#22C55E',
      display_revenue: '~$600M'
    },
    {
      id: 'rocket',
      name: 'Rocket Companies',
      sector: 'Fintech Platform',
      hq: '1050 Woodward Ave, Detroit, MI',
      revenue: '$5.1B adj. revenue (FY2024)',
      employees: '~14,200',
      context: 'Rocket Companies (NYSE: RKT) is a Detroit-based fintech platform. FY2024 adjusted revenue: $4.9B (+30% YoY). CEO: Varun Krishna (AI-forward leader). Market cap: $46.3B. Brands: Rocket Mortgage, Rocket Homes, Rocket Money (4.1M premium members), Rocket Loans, Amrock Title. Key AI platforms: Rocket Logic (proprietary AI loan origination system - helped bankers serve 54% more clients in Q4 2024 YoY), Navigator (internal AI workflow platform, used by 1/3 of team members, 600+ custom apps built without code). In 2024, AI automation saved 1M+ hours and $40M in efficiency. CTO: Shrikant Malhotra (2024). Key opportunity: AI platform engineering augmentation, data science for underwriting, financial services AI use cases, local Detroit peer relationship.',
      dot_color: '#EF4444',
      display_revenue: '$5.1B'
    },
    {
      id: 'uwm',
      name: 'United Wholesale Mortgage (UWM)',
      sector: 'Mortgage / Fintech',
      hq: '585 South Blvd E, Pontiac, Michigan',
      revenue: '~$3.5B est.',
      employees: '5,000-10,000',
      context: 'UWM (NYSE: UWMC) is the #1 wholesale mortgage lender in the US for 5+ consecutive years. CEO: Mat Ishbia. Pontiac, Michigan campus with thousands of on-site employees. Proprietary technology platforms: Blink+ (broker origination platform), BOLT (closing technology), UClose (same-day closing). Key executives: Mat Ishbia (CEO), Alex Elezaj (CSO), Adam Wolfe (CLO), Sarah DeCiantis (CMO). Technology: proprietary platforms, IBM DataPower, Microsoft Power Apps, AI-driven broker solutions. UWM publicly emphasizes being a tech-forward, AI-driven company as a competitive differentiator for its broker network. Key opportunity: AI workflow engineering for broker platform enhancement, underwriting AI/data science, broker experience AI, local Pontiac/Detroit relationship. NOTE: UWM is intensely culture-focused and on-site only - local presence is non-negotiable for this account.',
      dot_color: '#F59E0B',
      display_revenue: '~$3.5B'
    },
    {
      id: 'dte',
      name: 'DTE Energy',
      sector: 'Utilities / Energy',
      hq: 'Detroit, Michigan',
      revenue: '$12.5B (FY2024)',
      employees: '~10,000',
      context: 'DTE Energy (NYSE: DTE) is a Fortune 500 diversified energy company based in Detroit. Serves Michigan for 100+ years. CEO: Jerry Norcia. President & COO DTE Electric: Matt Paul. Segments: DTE Electric (SE Michigan residential/commercial/industrial), DTE Gas, Power & Industrial, Renewable Energy, Energy Trading. Technology: IBM DataPower, Microsoft Power Apps, SAP, OGsys, Stata, SCADA systems. Strategic program: "Energy grid of the future" - active investment in smart grid, renewable energy integration, EV charging infrastructure. DTE powers virtually every automotive manufacturing plant in Michigan, making it infrastructure for the entire automotive ecosystem. Key opportunity: smart grid AI/predictive maintenance, outage prediction AI, renewable energy dispatch optimization, customer-facing energy management AI, EV charging optimization. Grid Dynamics Detroit presence and automotive ecosystem relationships are strong differentiators.',
      dot_color: '#14B8A6',
      display_revenue: '$12.5B'
    }
  ];

  const insert = db.prepare(`
    INSERT INTO accounts (id, name, sector, hq, revenue, employees, context, dot_color, display_revenue)
    VALUES (@id, @name, @sector, @hq, @revenue, @employees, @context, @dot_color, @display_revenue)
  `);

  const seedAll = db.transaction((accounts) => {
    for (const acct of accounts) {
      insert.run(acct);
    }
  });

  seedAll(SEED_ACCOUNTS);
}

// Read current state for logging
const currentVersion = db.pragma('user_version', { simple: true });
const activeCount = db.prepare('SELECT COUNT(*) AS cnt FROM accounts WHERE is_deleted = 0').get().cnt;

console.log('  Database: ' + dbPath);
console.log('  Schema version: ' + currentVersion);
console.log('  Accounts: ' + activeCount + ' active');

// Query helpers

function getAccounts() {
  return db.prepare('SELECT * FROM accounts WHERE is_deleted = 0 ORDER BY sector, name').all();
}

function getAccount(id) {
  return db.prepare('SELECT * FROM accounts WHERE id = ? AND is_deleted = 0').get(id);
}

function createAccount({ name, sector, hq, revenue, employees, context, dot_color, display_revenue }) {
  // Generate id from name
  let baseId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').substring(0, 20);
  let id = baseId;
  let suffix = 2;
  while (db.prepare('SELECT id FROM accounts WHERE id = ?').get(id)) {
    id = baseId + '-' + suffix;
    suffix++;
  }

  db.prepare(`
    INSERT INTO accounts (id, name, sector, hq, revenue, employees, context, dot_color, display_revenue)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, sector || '', hq || '', revenue || '', employees || '', context || '', dot_color || '#3B82F6', display_revenue || '');

  return db.prepare('SELECT * FROM accounts WHERE id = ?').get(id);
}

function updateAccount(id, fields) {
  const existing = db.prepare('SELECT * FROM accounts WHERE id = ? AND is_deleted = 0').get(id);
  if (!existing) return null;

  const allowedFields = ['name', 'sector', 'hq', 'revenue', 'employees', 'context', 'dot_color', 'display_revenue'];
  const setClauses = [];
  const values = [];

  for (const field of allowedFields) {
    if (fields[field] !== undefined) {
      setClauses.push(field + ' = ?');
      values.push(fields[field]);
    }
  }

  if (setClauses.length === 0) {
    // Still update updated_at
    db.prepare("UPDATE accounts SET updated_at = datetime('now') WHERE id = ?").run(id);
    return db.prepare('SELECT * FROM accounts WHERE id = ?').get(id);
  }

  setClauses.push("updated_at = datetime('now')");
  values.push(id);

  db.prepare('UPDATE accounts SET ' + setClauses.join(', ') + ' WHERE id = ?').run(...values);
  return db.prepare('SELECT * FROM accounts WHERE id = ?').get(id);
}

function deleteAccount(id) {
  const result = db.prepare("UPDATE accounts SET is_deleted = 1, updated_at = datetime('now') WHERE id = ? AND is_deleted = 0").run(id);
  if (result.changes === 0) return null;
  return { success: true };
}

function restoreAccount(id) {
  db.prepare("UPDATE accounts SET is_deleted = 0, updated_at = datetime('now') WHERE id = ?").run(id);
  return db.prepare('SELECT * FROM accounts WHERE id = ?').get(id);
}

function getChatMessages(accountId) {
  return db.prepare('SELECT * FROM chat_messages WHERE account_id = ? ORDER BY created_at ASC LIMIT 100').all(accountId);
}

function addChatMessage(accountId, role, content) {
  const result = db.prepare('INSERT INTO chat_messages (account_id, role, content) VALUES (?, ?, ?)').run(accountId, role, content);
  return db.prepare('SELECT * FROM chat_messages WHERE id = ?').get(result.lastInsertRowid);
}

function clearChatMessages(accountId) {
  db.prepare('DELETE FROM chat_messages WHERE account_id = ?').run(accountId);
}

// Contact query helpers

function getContacts(accountId) {
  return db.prepare("SELECT * FROM contacts WHERE account_id = ? AND is_deleted = 0 ORDER BY CASE influence WHEN 'Champion' THEN 1 WHEN 'Evaluator' THEN 2 WHEN 'Blocker' THEN 3 END, name").all(accountId);
}

function getContact(id) {
  return db.prepare('SELECT * FROM contacts WHERE id = ? AND is_deleted = 0').get(id);
}

function createContact({ account_id, name, title, role, influence, email, linkedin, phone }) {
  const result = db.prepare(`
    INSERT INTO contacts (account_id, name, title, role, influence, email, linkedin, phone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(account_id, name, title || '', role || '', influence, email || '', linkedin || '', phone || '');
  return db.prepare('SELECT * FROM contacts WHERE id = ?').get(result.lastInsertRowid);
}

function updateContact(id, fields) {
  const existing = db.prepare('SELECT * FROM contacts WHERE id = ? AND is_deleted = 0').get(id);
  if (!existing) return null;

  const allowedFields = ['name', 'title', 'role', 'influence', 'email', 'linkedin', 'phone'];
  const setClauses = [];
  const values = [];

  for (const field of allowedFields) {
    if (fields[field] !== undefined) {
      setClauses.push(field + ' = ?');
      values.push(fields[field]);
    }
  }

  if (setClauses.length === 0) {
    db.prepare("UPDATE contacts SET updated_at = datetime('now') WHERE id = ?").run(id);
    return db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
  }

  setClauses.push("updated_at = datetime('now')");
  values.push(id);

  db.prepare('UPDATE contacts SET ' + setClauses.join(', ') + ' WHERE id = ?').run(...values);
  return db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
}

function deleteContact(id) {
  const result = db.prepare("UPDATE contacts SET is_deleted = 1, updated_at = datetime('now') WHERE id = ? AND is_deleted = 0").run(id);
  if (result.changes === 0) return null;
  return { success: true };
}

function getOutreachLog(contactId) {
  return db.prepare('SELECT * FROM outreach_log WHERE contact_id = ? ORDER BY date DESC, created_at DESC').all(contactId);
}

function addOutreachEntry(contactId, { date, channel, outcome, notes }) {
  const result = db.prepare('INSERT INTO outreach_log (contact_id, date, channel, outcome, notes) VALUES (?, ?, ?, ?, ?)').run(contactId, date, channel, outcome, notes || '');
  return db.prepare('SELECT * FROM outreach_log WHERE id = ?').get(result.lastInsertRowid);
}

function updateContactAI(id, { ai_rationale, warm_path }) {
  const result = db.prepare("UPDATE contacts SET ai_rationale = ?, warm_path = ?, researched_at = datetime('now'), updated_at = datetime('now') WHERE id = ? AND is_deleted = 0").run(ai_rationale, warm_path, id);
  if (result.changes === 0) return null;
  return db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
}

// Activity log query helpers

function getActivity(accountId, limit) {
  limit = limit || 50;
  return db.prepare(
    'SELECT * FROM activity_log WHERE account_id = ? ORDER BY created_at DESC LIMIT ?'
  ).all(accountId, limit);
}

function addActivity({ account_id, type, participants, summary, linked_contacts, source, ai_raw }) {
  var result = db.prepare(
    'INSERT INTO activity_log (account_id, type, participants, summary, linked_contacts, source, ai_raw) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(
    account_id, type, participants || '', summary,
    linked_contacts || null, source || 'manual', ai_raw || null
  );
  return db.prepare('SELECT * FROM activity_log WHERE id = ?').get(result.lastInsertRowid);
}

// Private intel query helpers

function getIntel(accountId) {
  return db.prepare('SELECT * FROM private_intel WHERE account_id = ? ORDER BY created_at DESC').all(accountId);
}

function addIntel(accountId, content) {
  var result = db.prepare('INSERT INTO private_intel (account_id, content) VALUES (?, ?)').run(accountId, content);
  return db.prepare('SELECT * FROM private_intel WHERE id = ?').get(result.lastInsertRowid);
}

// Strategy summary query helpers

function getStrategy(accountId) {
  return db.prepare('SELECT * FROM strategy_summaries WHERE account_id = ?').get(accountId);
}

function upsertStrategy(accountId, content) {
  db.prepare(`
    INSERT INTO strategy_summaries (account_id, content, generated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(account_id) DO UPDATE SET
      content = excluded.content,
      generated_at = excluded.generated_at,
      is_edited = 0,
      edited_at = NULL
  `).run(accountId, content);
  return db.prepare('SELECT * FROM strategy_summaries WHERE account_id = ?').get(accountId);
}

function updateStrategyContent(accountId, content) {
  var result = db.prepare(`
    UPDATE strategy_summaries
    SET content = ?, is_edited = 1, edited_at = datetime('now')
    WHERE account_id = ?
  `).run(content, accountId);
  if (result.changes === 0) return null;
  return db.prepare('SELECT * FROM strategy_summaries WHERE account_id = ?').get(accountId);
}

// Buying triggers query helpers

function getTriggers(accountId) {
  return db.prepare('SELECT * FROM buying_triggers WHERE account_id = ? ORDER BY created_at DESC').all(accountId);
}

function addTrigger({ account_id, tag, category, notes }) {
  var result = db.prepare('INSERT INTO buying_triggers (account_id, tag, category, notes) VALUES (?, ?, ?, ?)').run(account_id, tag, category, notes || '');
  return db.prepare('SELECT * FROM buying_triggers WHERE id = ?').get(result.lastInsertRowid);
}

// Refresh query helpers

function getMonthlyBudget() {
  var period = new Date().toISOString().substring(0, 7);
  var row = db.prepare('SELECT * FROM refresh_budget WHERE period = ?').get(period);
  if (row) return row;
  return { period: period, tokens_used: 0, budget_limit: parseInt(process.env.REFRESH_TOKEN_BUDGET) || 500000 };
}

function recordRefreshTokens(accountId, tokensUsed, refreshType, changesSummary) {
  var period = new Date().toISOString().substring(0, 7);
  var limit = parseInt(process.env.REFRESH_TOKEN_BUDGET) || 500000;

  db.prepare(`
    INSERT INTO refresh_budget (period, tokens_used, budget_limit, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(period) DO UPDATE SET
      tokens_used = tokens_used + excluded.tokens_used,
      budget_limit = excluded.budget_limit,
      updated_at = excluded.updated_at
  `).run(period, tokensUsed, limit);

  db.prepare(`
    INSERT INTO refresh_log (account_id, tokens_used, refresh_type, changes_summary)
    VALUES (?, ?, ?, ?)
  `).run(accountId, tokensUsed, refreshType, changesSummary || null);
}

function updateAccountFromRefresh(id, fields) {
  var setClauses = [];
  var values = [];
  var refreshFields = ['context', 'revenue', 'employees', 'last_refreshed_at'];

  for (var i = 0; i < refreshFields.length; i++) {
    var field = refreshFields[i];
    if (fields[field] !== undefined && fields[field] !== null) {
      setClauses.push(field + ' = ?');
      values.push(fields[field]);
    }
  }

  if (setClauses.length === 0) return db.prepare('SELECT * FROM accounts WHERE id = ?').get(id);

  setClauses.push("updated_at = datetime('now')");
  values.push(id);
  db.prepare('UPDATE accounts SET ' + setClauses.join(', ') + ' WHERE id = ?').run(...values);
  return db.prepare('SELECT * FROM accounts WHERE id = ?').get(id);
}

function getRefreshLog(accountId, limit) {
  var lim = limit || 10;
  return db.prepare('SELECT * FROM refresh_log WHERE account_id = ? ORDER BY created_at DESC LIMIT ?').all(accountId, lim);
}

function getAccountsByRefreshPriority() {
  return db.prepare('SELECT * FROM accounts WHERE is_deleted = 0 ORDER BY last_refreshed_at IS NOT NULL, last_refreshed_at ASC').all();
}

// Briefing query helpers

function getBriefing(accountId) {
  return db.prepare('SELECT * FROM briefings WHERE account_id = ?').get(accountId);
}

function saveBriefing(accountId, content, tokensUsed) {
  db.prepare(`
    INSERT INTO briefings (account_id, content, tokens_used, generated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(account_id) DO UPDATE SET
      content = excluded.content,
      tokens_used = excluded.tokens_used,
      generated_at = excluded.generated_at
  `).run(accountId, content, tokensUsed || 0);
  return db.prepare('SELECT * FROM briefings WHERE account_id = ?').get(accountId);
}

module.exports = {
  dbPath,
  db,
  getAccounts,
  getAccount,
  createAccount,
  updateAccount,
  deleteAccount,
  restoreAccount,
  getChatMessages,
  addChatMessage,
  clearChatMessages,
  getContacts,
  getContact,
  createContact,
  updateContact,
  deleteContact,
  getOutreachLog,
  addOutreachEntry,
  updateContactAI,
  getActivity,
  addActivity,
  getIntel,
  addIntel,
  getStrategy,
  upsertStrategy,
  updateStrategyContent,
  getTriggers,
  addTrigger,
  getMonthlyBudget,
  recordRefreshTokens,
  updateAccountFromRefresh,
  getRefreshLog,
  getAccountsByRefreshPriority,
  getBriefing,
  saveBriefing
};
