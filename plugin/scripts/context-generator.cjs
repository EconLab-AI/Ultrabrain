"use strict";var Nt=Object.create;var w=Object.defineProperty;var bt=Object.getOwnPropertyDescriptor;var ft=Object.getOwnPropertyNames;var St=Object.getPrototypeOf,ht=Object.prototype.hasOwnProperty;var It=(r,e)=>{for(var t in e)w(r,t,{get:e[t],enumerable:!0})},oe=(r,e,t,s)=>{if(e&&typeof e=="object"||typeof e=="function")for(let n of ft(e))!ht.call(r,n)&&n!==t&&w(r,n,{get:()=>e[n],enumerable:!(s=bt(e,n))||s.enumerable});return r};var C=(r,e,t)=>(t=r!=null?Nt(St(r)):{},oe(e||!r||!r.__esModule?w(t,"default",{value:r,enumerable:!0}):t,r)),Ot=r=>oe(w({},"__esModule",{value:!0}),r);var Bt={};It(Bt,{generateContext:()=>ne});module.exports=Ot(Bt);var Tt=C(require("path"),1),gt=require("os"),Rt=require("fs");var ge=require("bun:sqlite");var f=require("path"),le=require("os"),ue=require("fs");var me=require("url");var O=require("fs"),$=require("path"),de=require("os");var ie="bugfix,feature,refactor,discovery,decision,change",ae="how-it-works,why-it-exists,what-changed,problem-solution,gotcha,pattern,trade-off";var y=class{static DEFAULTS={ULTRABRAIN_MODEL:"claude-sonnet-4-5",ULTRABRAIN_CONTEXT_OBSERVATIONS:"50",ULTRABRAIN_WORKER_PORT:"37777",ULTRABRAIN_WORKER_HOST:"127.0.0.1",ULTRABRAIN_SKIP_TOOLS:"ListMcpResourcesTool,SlashCommand,Skill,TodoWrite,AskUserQuestion",ULTRABRAIN_PROVIDER:"claude",ULTRABRAIN_CLAUDE_AUTH_METHOD:"cli",ULTRABRAIN_GEMINI_API_KEY:"",ULTRABRAIN_GEMINI_MODEL:"gemini-2.5-flash-lite",ULTRABRAIN_GEMINI_RATE_LIMITING_ENABLED:"true",ULTRABRAIN_OPENROUTER_API_KEY:"",ULTRABRAIN_OPENROUTER_MODEL:"xiaomi/mimo-v2-flash:free",ULTRABRAIN_OPENROUTER_SITE_URL:"",ULTRABRAIN_OPENROUTER_APP_NAME:"ultrabrain",ULTRABRAIN_OPENROUTER_MAX_CONTEXT_MESSAGES:"20",ULTRABRAIN_OPENROUTER_MAX_TOKENS:"100000",ULTRABRAIN_DATA_DIR:(0,$.join)((0,de.homedir)(),".ultrabrain"),ULTRABRAIN_LOG_LEVEL:"INFO",ULTRABRAIN_PYTHON_VERSION:"3.13",CLAUDE_CODE_PATH:"",ULTRABRAIN_MODE:"code",ULTRABRAIN_CONTEXT_SHOW_READ_TOKENS:"true",ULTRABRAIN_CONTEXT_SHOW_WORK_TOKENS:"true",ULTRABRAIN_CONTEXT_SHOW_SAVINGS_AMOUNT:"true",ULTRABRAIN_CONTEXT_SHOW_SAVINGS_PERCENT:"true",ULTRABRAIN_CONTEXT_OBSERVATION_TYPES:ie,ULTRABRAIN_CONTEXT_OBSERVATION_CONCEPTS:ae,ULTRABRAIN_CONTEXT_FULL_COUNT:"5",ULTRABRAIN_CONTEXT_FULL_FIELD:"narrative",ULTRABRAIN_CONTEXT_SESSION_COUNT:"10",ULTRABRAIN_CONTEXT_SHOW_LAST_SUMMARY:"true",ULTRABRAIN_CONTEXT_SHOW_LAST_MESSAGE:"false",ULTRABRAIN_FOLDER_CLAUDEMD_ENABLED:"false",ULTRABRAIN_EXCLUDED_PROJECTS:"",ULTRABRAIN_FOLDER_MD_EXCLUDE:"[]"};static getAllDefaults(){return{...this.DEFAULTS}}static get(e){return this.DEFAULTS[e]}static getInt(e){let t=this.get(e);return parseInt(t,10)}static getBool(e){let t=this.get(e);return t==="true"||t===!0}static applyEnvOverrides(e){let t={...e};for(let s of Object.keys(this.DEFAULTS))process.env[s]!==void 0&&(t[s]=process.env[s]);return t}static loadFromFile(e){try{if(!(0,O.existsSync)(e)){let i=this.getAllDefaults();try{let a=(0,$.dirname)(e);(0,O.existsSync)(a)||(0,O.mkdirSync)(a,{recursive:!0}),(0,O.writeFileSync)(e,JSON.stringify(i,null,2),"utf-8"),console.log("[SETTINGS] Created settings file with defaults:",e)}catch(a){console.warn("[SETTINGS] Failed to create settings file, using in-memory defaults:",e,a)}return this.applyEnvOverrides(i)}let t=(0,O.readFileSync)(e,"utf-8"),s=JSON.parse(t),n=s;if(s.env&&typeof s.env=="object"){n=s.env;try{(0,O.writeFileSync)(e,JSON.stringify(n,null,2),"utf-8"),console.log("[SETTINGS] Migrated settings file from nested to flat schema:",e)}catch(i){console.warn("[SETTINGS] Failed to auto-migrate settings file:",e,i)}}let o={...this.DEFAULTS};for(let i of Object.keys(this.DEFAULTS))n[i]!==void 0&&(o[i]=n[i]);return this.applyEnvOverrides(o)}catch(t){return console.warn("[SETTINGS] Failed to load settings, using defaults:",e,t),this.applyEnvOverrides(this.getAllDefaults())}}};var L=require("fs"),U=require("path"),pe=require("os"),Y=(o=>(o[o.DEBUG=0]="DEBUG",o[o.INFO=1]="INFO",o[o.WARN=2]="WARN",o[o.ERROR=3]="ERROR",o[o.SILENT=4]="SILENT",o))(Y||{}),ce=(0,U.join)((0,pe.homedir)(),".ultrabrain"),V=class{level=null;useColor;logFilePath=null;logFileInitialized=!1;constructor(){this.useColor=process.stdout.isTTY??!1}ensureLogFileInitialized(){if(!this.logFileInitialized){this.logFileInitialized=!0;try{let e=(0,U.join)(ce,"logs");(0,L.existsSync)(e)||(0,L.mkdirSync)(e,{recursive:!0});let t=new Date().toISOString().split("T")[0];this.logFilePath=(0,U.join)(e,`ultrabrain-${t}.log`)}catch(e){console.error("[LOGGER] Failed to initialize log file:",e),this.logFilePath=null}}}getLevel(){if(this.level===null)try{let e=(0,U.join)(ce,"settings.json");if((0,L.existsSync)(e)){let t=(0,L.readFileSync)(e,"utf-8"),n=(JSON.parse(t).ULTRABRAIN_LOG_LEVEL||"INFO").toUpperCase();this.level=Y[n]??1}else this.level=1}catch{this.level=1}return this.level}correlationId(e,t){return`obs-${e}-${t}`}sessionId(e){return`session-${e}`}formatData(e){if(e==null)return"";if(typeof e=="string")return e;if(typeof e=="number"||typeof e=="boolean")return e.toString();if(typeof e=="object"){if(e instanceof Error)return this.getLevel()===0?`${e.message}
${e.stack}`:e.message;if(Array.isArray(e))return`[${e.length} items]`;let t=Object.keys(e);return t.length===0?"{}":t.length<=3?JSON.stringify(e):`{${t.length} keys: ${t.slice(0,3).join(", ")}...}`}return String(e)}formatTool(e,t){if(!t)return e;let s=t;if(typeof t=="string")try{s=JSON.parse(t)}catch{s=t}if(e==="Bash"&&s.command)return`${e}(${s.command})`;if(s.file_path)return`${e}(${s.file_path})`;if(s.notebook_path)return`${e}(${s.notebook_path})`;if(e==="Glob"&&s.pattern)return`${e}(${s.pattern})`;if(e==="Grep"&&s.pattern)return`${e}(${s.pattern})`;if(s.url)return`${e}(${s.url})`;if(s.query)return`${e}(${s.query})`;if(e==="Task"){if(s.subagent_type)return`${e}(${s.subagent_type})`;if(s.description)return`${e}(${s.description})`}return e==="Skill"&&s.skill?`${e}(${s.skill})`:e==="LSP"&&s.operation?`${e}(${s.operation})`:e}formatTimestamp(e){let t=e.getFullYear(),s=String(e.getMonth()+1).padStart(2,"0"),n=String(e.getDate()).padStart(2,"0"),o=String(e.getHours()).padStart(2,"0"),i=String(e.getMinutes()).padStart(2,"0"),a=String(e.getSeconds()).padStart(2,"0"),d=String(e.getMilliseconds()).padStart(3,"0");return`${t}-${s}-${n} ${o}:${i}:${a}.${d}`}log(e,t,s,n,o){if(e<this.getLevel())return;this.ensureLogFileInitialized();let i=this.formatTimestamp(new Date),a=Y[e].padEnd(5),d=t.padEnd(6),p="";n?.correlationId?p=`[${n.correlationId}] `:n?.sessionId&&(p=`[session-${n.sessionId}] `);let u="";o!=null&&(o instanceof Error?u=this.getLevel()===0?`
${o.message}
${o.stack}`:` ${o.message}`:this.getLevel()===0&&typeof o=="object"?u=`
`+JSON.stringify(o,null,2):u=" "+this.formatData(o));let m="";if(n){let{sessionId:E,memorySessionId:g,correlationId:b,..._}=n;Object.keys(_).length>0&&(m=` {${Object.entries(_).map(([R,h])=>`${R}=${h}`).join(", ")}}`)}let T=`[${i}] [${a}] [${d}] ${p}${s}${m}${u}`;if(this.logFilePath)try{(0,L.appendFileSync)(this.logFilePath,T+`
`,"utf8")}catch(E){process.stderr.write(`[LOGGER] Failed to write to log file: ${E}
`)}else process.stderr.write(T+`
`)}debug(e,t,s,n){this.log(0,e,t,s,n)}info(e,t,s,n){this.log(1,e,t,s,n)}warn(e,t,s,n){this.log(2,e,t,s,n)}error(e,t,s,n){this.log(3,e,t,s,n)}dataIn(e,t,s,n){this.info(e,`\u2192 ${t}`,s,n)}dataOut(e,t,s,n){this.info(e,`\u2190 ${t}`,s,n)}success(e,t,s,n){this.info(e,`\u2713 ${t}`,s,n)}failure(e,t,s,n){this.error(e,`\u2717 ${t}`,s,n)}timing(e,t,s,n){this.info(e,`\u23F1 ${t}`,n,{duration:`${s}ms`})}happyPathError(e,t,s,n,o=""){let p=((new Error().stack||"").split(`
`)[2]||"").match(/at\s+(?:.*\s+)?\(?([^:]+):(\d+):(\d+)\)?/),u=p?`${p[1].split("/").pop()}:${p[2]}`:"unknown",m={...s,location:u};return this.warn(e,`[HAPPY-PATH] ${t}`,m,n),o}},l=new V;var Ct={};function At(){return typeof __dirname<"u"?__dirname:(0,f.dirname)((0,me.fileURLToPath)(Ct.url))}var Lt=At(),I=y.get("ULTRABRAIN_DATA_DIR"),v=process.env.CLAUDE_CONFIG_DIR||(0,f.join)((0,le.homedir)(),".claude"),Jt=(0,f.join)(v,"plugins","marketplaces","EconLab-AI"),zt=(0,f.join)(I,"archives"),Qt=(0,f.join)(I,"logs"),Zt=(0,f.join)(I,"trash"),es=(0,f.join)(I,"backups"),ts=(0,f.join)(I,"modes"),ss=(0,f.join)(I,"settings.json"),_e=(0,f.join)(I,"ultrabrain.db"),rs=(0,f.join)(I,"vector-db"),ns=(0,f.join)(I,"observer-sessions"),os=(0,f.join)(v,"settings.json"),is=(0,f.join)(v,"commands"),as=(0,f.join)(v,"CLAUDE.md");function Ee(r){(0,ue.mkdirSync)(r,{recursive:!0})}function Te(){return(0,f.join)(Lt,"..")}var X=class{db;constructor(e=_e){e!==":memory:"&&Ee(I),this.db=new ge.Database(e),this.db.run("PRAGMA journal_mode = WAL"),this.db.run("PRAGMA synchronous = NORMAL"),this.db.run("PRAGMA foreign_keys = ON"),this.initializeSchema(),this.ensureWorkerPortColumn(),this.ensurePromptTrackingColumns(),this.removeSessionSummariesUniqueConstraint(),this.addObservationHierarchicalFields(),this.makeObservationsTextNullable(),this.createUserPromptsTable(),this.ensureDiscoveryTokensColumn(),this.createPendingMessagesTable(),this.renameSessionIdColumns(),this.repairSessionIdColumnRename(),this.addFailedAtEpochColumn(),this.addOnUpdateCascadeToForeignKeys(),this.addSessionSourceColumn(),this.createTasksTable(),this.createTagsSystem(),this.createLoopTables(),this.ensureTasksObservationIdColumn(),this.createTerminalSessionsTable(),this.createAutomationTables(),this.createTerminalRecordingsTable()}initializeSchema(){this.db.run(`
      CREATE TABLE IF NOT EXISTS schema_versions (
        id INTEGER PRIMARY KEY,
        version INTEGER UNIQUE NOT NULL,
        applied_at TEXT NOT NULL
      )
    `);let e=this.db.prepare("SELECT version FROM schema_versions ORDER BY version").all();(e.length>0?Math.max(...e.map(s=>s.version)):0)===0&&(l.info("DB","Initializing fresh database with migration004"),this.db.run(`
        CREATE TABLE IF NOT EXISTS sdk_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          content_session_id TEXT UNIQUE NOT NULL,
          memory_session_id TEXT UNIQUE,
          project TEXT NOT NULL,
          user_prompt TEXT,
          started_at TEXT NOT NULL,
          started_at_epoch INTEGER NOT NULL,
          completed_at TEXT,
          completed_at_epoch INTEGER,
          status TEXT CHECK(status IN ('active', 'completed', 'failed')) NOT NULL DEFAULT 'active',
          source TEXT NOT NULL DEFAULT 'claude-code'
        );

        CREATE INDEX IF NOT EXISTS idx_sdk_sessions_claude_id ON sdk_sessions(content_session_id);
        CREATE INDEX IF NOT EXISTS idx_sdk_sessions_sdk_id ON sdk_sessions(memory_session_id);
        CREATE INDEX IF NOT EXISTS idx_sdk_sessions_project ON sdk_sessions(project);
        CREATE INDEX IF NOT EXISTS idx_sdk_sessions_status ON sdk_sessions(status);
        CREATE INDEX IF NOT EXISTS idx_sdk_sessions_started ON sdk_sessions(started_at_epoch DESC);
        CREATE INDEX IF NOT EXISTS idx_sdk_sessions_source ON sdk_sessions(source);

        CREATE TABLE IF NOT EXISTS observations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          memory_session_id TEXT NOT NULL,
          project TEXT NOT NULL,
          text TEXT NOT NULL,
          type TEXT NOT NULL,
          created_at TEXT NOT NULL,
          created_at_epoch INTEGER NOT NULL,
          FOREIGN KEY(memory_session_id) REFERENCES sdk_sessions(memory_session_id) ON DELETE CASCADE ON UPDATE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_observations_sdk_session ON observations(memory_session_id);
        CREATE INDEX IF NOT EXISTS idx_observations_project ON observations(project);
        CREATE INDEX IF NOT EXISTS idx_observations_type ON observations(type);
        CREATE INDEX IF NOT EXISTS idx_observations_created ON observations(created_at_epoch DESC);

        CREATE TABLE IF NOT EXISTS session_summaries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          memory_session_id TEXT UNIQUE NOT NULL,
          project TEXT NOT NULL,
          request TEXT,
          investigated TEXT,
          learned TEXT,
          completed TEXT,
          next_steps TEXT,
          files_read TEXT,
          files_edited TEXT,
          notes TEXT,
          created_at TEXT NOT NULL,
          created_at_epoch INTEGER NOT NULL,
          FOREIGN KEY(memory_session_id) REFERENCES sdk_sessions(memory_session_id) ON DELETE CASCADE ON UPDATE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_session_summaries_sdk_session ON session_summaries(memory_session_id);
        CREATE INDEX IF NOT EXISTS idx_session_summaries_project ON session_summaries(project);
        CREATE INDEX IF NOT EXISTS idx_session_summaries_created ON session_summaries(created_at_epoch DESC);
      `),this.db.prepare("INSERT INTO schema_versions (version, applied_at) VALUES (?, ?)").run(4,new Date().toISOString()),l.info("DB","Migration004 applied successfully"))}ensureWorkerPortColumn(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(5))return;this.db.query("PRAGMA table_info(sdk_sessions)").all().some(n=>n.name==="worker_port")||(this.db.run("ALTER TABLE sdk_sessions ADD COLUMN worker_port INTEGER"),l.debug("DB","Added worker_port column to sdk_sessions table")),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(5,new Date().toISOString())}ensurePromptTrackingColumns(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(6))return;this.db.query("PRAGMA table_info(sdk_sessions)").all().some(d=>d.name==="prompt_counter")||(this.db.run("ALTER TABLE sdk_sessions ADD COLUMN prompt_counter INTEGER DEFAULT 0"),l.debug("DB","Added prompt_counter column to sdk_sessions table")),this.db.query("PRAGMA table_info(observations)").all().some(d=>d.name==="prompt_number")||(this.db.run("ALTER TABLE observations ADD COLUMN prompt_number INTEGER"),l.debug("DB","Added prompt_number column to observations table")),this.db.query("PRAGMA table_info(session_summaries)").all().some(d=>d.name==="prompt_number")||(this.db.run("ALTER TABLE session_summaries ADD COLUMN prompt_number INTEGER"),l.debug("DB","Added prompt_number column to session_summaries table")),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(6,new Date().toISOString())}removeSessionSummariesUniqueConstraint(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(7))return;if(!this.db.query("PRAGMA index_list(session_summaries)").all().some(n=>n.unique===1)){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(7,new Date().toISOString());return}l.debug("DB","Removing UNIQUE constraint from session_summaries.memory_session_id"),this.db.run("BEGIN TRANSACTION"),this.db.run(`
      CREATE TABLE session_summaries_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        memory_session_id TEXT NOT NULL,
        project TEXT NOT NULL,
        request TEXT,
        investigated TEXT,
        learned TEXT,
        completed TEXT,
        next_steps TEXT,
        files_read TEXT,
        files_edited TEXT,
        notes TEXT,
        prompt_number INTEGER,
        created_at TEXT NOT NULL,
        created_at_epoch INTEGER NOT NULL,
        FOREIGN KEY(memory_session_id) REFERENCES sdk_sessions(memory_session_id) ON DELETE CASCADE
      )
    `),this.db.run(`
      INSERT INTO session_summaries_new
      SELECT id, memory_session_id, project, request, investigated, learned,
             completed, next_steps, files_read, files_edited, notes,
             prompt_number, created_at, created_at_epoch
      FROM session_summaries
    `),this.db.run("DROP TABLE session_summaries"),this.db.run("ALTER TABLE session_summaries_new RENAME TO session_summaries"),this.db.run(`
      CREATE INDEX idx_session_summaries_sdk_session ON session_summaries(memory_session_id);
      CREATE INDEX idx_session_summaries_project ON session_summaries(project);
      CREATE INDEX idx_session_summaries_created ON session_summaries(created_at_epoch DESC);
    `),this.db.run("COMMIT"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(7,new Date().toISOString()),l.debug("DB","Successfully removed UNIQUE constraint from session_summaries.memory_session_id")}addObservationHierarchicalFields(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(8))return;if(this.db.query("PRAGMA table_info(observations)").all().some(n=>n.name==="title")){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(8,new Date().toISOString());return}l.debug("DB","Adding hierarchical fields to observations table"),this.db.run(`
      ALTER TABLE observations ADD COLUMN title TEXT;
      ALTER TABLE observations ADD COLUMN subtitle TEXT;
      ALTER TABLE observations ADD COLUMN facts TEXT;
      ALTER TABLE observations ADD COLUMN narrative TEXT;
      ALTER TABLE observations ADD COLUMN concepts TEXT;
      ALTER TABLE observations ADD COLUMN files_read TEXT;
      ALTER TABLE observations ADD COLUMN files_modified TEXT;
    `),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(8,new Date().toISOString()),l.debug("DB","Successfully added hierarchical fields to observations table")}makeObservationsTextNullable(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(9))return;let s=this.db.query("PRAGMA table_info(observations)").all().find(n=>n.name==="text");if(!s||s.notnull===0){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(9,new Date().toISOString());return}l.debug("DB","Making observations.text nullable"),this.db.run("BEGIN TRANSACTION"),this.db.run(`
      CREATE TABLE observations_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        memory_session_id TEXT NOT NULL,
        project TEXT NOT NULL,
        text TEXT,
        type TEXT NOT NULL,
        title TEXT,
        subtitle TEXT,
        facts TEXT,
        narrative TEXT,
        concepts TEXT,
        files_read TEXT,
        files_modified TEXT,
        prompt_number INTEGER,
        created_at TEXT NOT NULL,
        created_at_epoch INTEGER NOT NULL,
        FOREIGN KEY(memory_session_id) REFERENCES sdk_sessions(memory_session_id) ON DELETE CASCADE
      )
    `),this.db.run(`
      INSERT INTO observations_new
      SELECT id, memory_session_id, project, text, type, title, subtitle, facts,
             narrative, concepts, files_read, files_modified, prompt_number,
             created_at, created_at_epoch
      FROM observations
    `),this.db.run("DROP TABLE observations"),this.db.run("ALTER TABLE observations_new RENAME TO observations"),this.db.run(`
      CREATE INDEX idx_observations_sdk_session ON observations(memory_session_id);
      CREATE INDEX idx_observations_project ON observations(project);
      CREATE INDEX idx_observations_type ON observations(type);
      CREATE INDEX idx_observations_created ON observations(created_at_epoch DESC);
    `),this.db.run("COMMIT"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(9,new Date().toISOString()),l.debug("DB","Successfully made observations.text nullable")}createUserPromptsTable(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(10))return;if(this.db.query("PRAGMA table_info(user_prompts)").all().length>0){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(10,new Date().toISOString());return}l.debug("DB","Creating user_prompts table with FTS5 support"),this.db.run("BEGIN TRANSACTION"),this.db.run(`
      CREATE TABLE user_prompts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content_session_id TEXT NOT NULL,
        prompt_number INTEGER NOT NULL,
        prompt_text TEXT NOT NULL,
        created_at TEXT NOT NULL,
        created_at_epoch INTEGER NOT NULL,
        FOREIGN KEY(content_session_id) REFERENCES sdk_sessions(content_session_id) ON DELETE CASCADE
      );

      CREATE INDEX idx_user_prompts_claude_session ON user_prompts(content_session_id);
      CREATE INDEX idx_user_prompts_created ON user_prompts(created_at_epoch DESC);
      CREATE INDEX idx_user_prompts_prompt_number ON user_prompts(prompt_number);
      CREATE INDEX idx_user_prompts_lookup ON user_prompts(content_session_id, prompt_number);
    `),this.db.run(`
      CREATE VIRTUAL TABLE user_prompts_fts USING fts5(
        prompt_text,
        content='user_prompts',
        content_rowid='id'
      );
    `),this.db.run(`
      CREATE TRIGGER user_prompts_ai AFTER INSERT ON user_prompts BEGIN
        INSERT INTO user_prompts_fts(rowid, prompt_text)
        VALUES (new.id, new.prompt_text);
      END;

      CREATE TRIGGER user_prompts_ad AFTER DELETE ON user_prompts BEGIN
        INSERT INTO user_prompts_fts(user_prompts_fts, rowid, prompt_text)
        VALUES('delete', old.id, old.prompt_text);
      END;

      CREATE TRIGGER user_prompts_au AFTER UPDATE ON user_prompts BEGIN
        INSERT INTO user_prompts_fts(user_prompts_fts, rowid, prompt_text)
        VALUES('delete', old.id, old.prompt_text);
        INSERT INTO user_prompts_fts(rowid, prompt_text)
        VALUES (new.id, new.prompt_text);
      END;
    `),this.db.run("COMMIT"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(10,new Date().toISOString()),l.debug("DB","Successfully created user_prompts table with FTS5 support")}ensureDiscoveryTokensColumn(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(11))return;this.db.query("PRAGMA table_info(observations)").all().some(i=>i.name==="discovery_tokens")||(this.db.run("ALTER TABLE observations ADD COLUMN discovery_tokens INTEGER DEFAULT 0"),l.debug("DB","Added discovery_tokens column to observations table")),this.db.query("PRAGMA table_info(session_summaries)").all().some(i=>i.name==="discovery_tokens")||(this.db.run("ALTER TABLE session_summaries ADD COLUMN discovery_tokens INTEGER DEFAULT 0"),l.debug("DB","Added discovery_tokens column to session_summaries table")),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(11,new Date().toISOString())}createPendingMessagesTable(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(16))return;if(this.db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='pending_messages'").all().length>0){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(16,new Date().toISOString());return}l.debug("DB","Creating pending_messages table"),this.db.run(`
      CREATE TABLE pending_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_db_id INTEGER NOT NULL,
        content_session_id TEXT NOT NULL,
        message_type TEXT NOT NULL CHECK(message_type IN ('observation', 'summarize')),
        tool_name TEXT,
        tool_input TEXT,
        tool_response TEXT,
        cwd TEXT,
        last_user_message TEXT,
        last_assistant_message TEXT,
        prompt_number INTEGER,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'processed', 'failed')),
        retry_count INTEGER NOT NULL DEFAULT 0,
        created_at_epoch INTEGER NOT NULL,
        started_processing_at_epoch INTEGER,
        completed_at_epoch INTEGER,
        FOREIGN KEY (session_db_id) REFERENCES sdk_sessions(id) ON DELETE CASCADE
      )
    `),this.db.run("CREATE INDEX IF NOT EXISTS idx_pending_messages_session ON pending_messages(session_db_id)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_pending_messages_status ON pending_messages(status)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_pending_messages_claude_session ON pending_messages(content_session_id)"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(16,new Date().toISOString()),l.debug("DB","pending_messages table created successfully")}renameSessionIdColumns(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(17))return;l.debug("DB","Checking session ID columns for semantic clarity rename");let t=0,s=(n,o,i)=>{let a=this.db.query(`PRAGMA table_info(${n})`).all(),d=a.some(u=>u.name===o);return a.some(u=>u.name===i)?!1:d?(this.db.run(`ALTER TABLE ${n} RENAME COLUMN ${o} TO ${i}`),l.debug("DB",`Renamed ${n}.${o} to ${i}`),!0):(l.warn("DB",`Column ${o} not found in ${n}, skipping rename`),!1)};s("sdk_sessions","claude_session_id","content_session_id")&&t++,s("sdk_sessions","sdk_session_id","memory_session_id")&&t++,s("pending_messages","claude_session_id","content_session_id")&&t++,s("observations","sdk_session_id","memory_session_id")&&t++,s("session_summaries","sdk_session_id","memory_session_id")&&t++,s("user_prompts","claude_session_id","content_session_id")&&t++,this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(17,new Date().toISOString()),t>0?l.debug("DB",`Successfully renamed ${t} session ID columns`):l.debug("DB","No session ID column renames needed (already up to date)")}repairSessionIdColumnRename(){this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(19)||this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(19,new Date().toISOString())}addFailedAtEpochColumn(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(20))return;this.db.query("PRAGMA table_info(pending_messages)").all().some(n=>n.name==="failed_at_epoch")||(this.db.run("ALTER TABLE pending_messages ADD COLUMN failed_at_epoch INTEGER"),l.debug("DB","Added failed_at_epoch column to pending_messages table")),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(20,new Date().toISOString())}addOnUpdateCascadeToForeignKeys(){if(!this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(21)){l.debug("DB","Adding ON UPDATE CASCADE to FK constraints on observations and session_summaries"),this.db.run("PRAGMA foreign_keys = OFF"),this.db.run("BEGIN TRANSACTION");try{this.db.run("DROP TRIGGER IF EXISTS observations_ai"),this.db.run("DROP TRIGGER IF EXISTS observations_ad"),this.db.run("DROP TRIGGER IF EXISTS observations_au"),this.db.run(`
        CREATE TABLE observations_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          memory_session_id TEXT NOT NULL,
          project TEXT NOT NULL,
          text TEXT,
          type TEXT NOT NULL,
          title TEXT,
          subtitle TEXT,
          facts TEXT,
          narrative TEXT,
          concepts TEXT,
          files_read TEXT,
          files_modified TEXT,
          prompt_number INTEGER,
          discovery_tokens INTEGER DEFAULT 0,
          created_at TEXT NOT NULL,
          created_at_epoch INTEGER NOT NULL,
          FOREIGN KEY(memory_session_id) REFERENCES sdk_sessions(memory_session_id) ON DELETE CASCADE ON UPDATE CASCADE
        )
      `),this.db.run(`
        INSERT INTO observations_new
        SELECT id, memory_session_id, project, text, type, title, subtitle, facts,
               narrative, concepts, files_read, files_modified, prompt_number,
               discovery_tokens, created_at, created_at_epoch
        FROM observations
      `),this.db.run("DROP TABLE observations"),this.db.run("ALTER TABLE observations_new RENAME TO observations"),this.db.run(`
        CREATE INDEX idx_observations_sdk_session ON observations(memory_session_id);
        CREATE INDEX idx_observations_project ON observations(project);
        CREATE INDEX idx_observations_type ON observations(type);
        CREATE INDEX idx_observations_created ON observations(created_at_epoch DESC);
      `),this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='observations_fts'").all().length>0&&this.db.run(`
          CREATE TRIGGER IF NOT EXISTS observations_ai AFTER INSERT ON observations BEGIN
            INSERT INTO observations_fts(rowid, title, subtitle, narrative, text, facts, concepts)
            VALUES (new.id, new.title, new.subtitle, new.narrative, new.text, new.facts, new.concepts);
          END;

          CREATE TRIGGER IF NOT EXISTS observations_ad AFTER DELETE ON observations BEGIN
            INSERT INTO observations_fts(observations_fts, rowid, title, subtitle, narrative, text, facts, concepts)
            VALUES('delete', old.id, old.title, old.subtitle, old.narrative, old.text, old.facts, old.concepts);
          END;

          CREATE TRIGGER IF NOT EXISTS observations_au AFTER UPDATE ON observations BEGIN
            INSERT INTO observations_fts(observations_fts, rowid, title, subtitle, narrative, text, facts, concepts)
            VALUES('delete', old.id, old.title, old.subtitle, old.narrative, old.text, old.facts, old.concepts);
            INSERT INTO observations_fts(rowid, title, subtitle, narrative, text, facts, concepts)
            VALUES (new.id, new.title, new.subtitle, new.narrative, new.text, new.facts, new.concepts);
          END;
        `),this.db.run(`
        CREATE TABLE session_summaries_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          memory_session_id TEXT NOT NULL,
          project TEXT NOT NULL,
          request TEXT,
          investigated TEXT,
          learned TEXT,
          completed TEXT,
          next_steps TEXT,
          files_read TEXT,
          files_edited TEXT,
          notes TEXT,
          prompt_number INTEGER,
          discovery_tokens INTEGER DEFAULT 0,
          created_at TEXT NOT NULL,
          created_at_epoch INTEGER NOT NULL,
          FOREIGN KEY(memory_session_id) REFERENCES sdk_sessions(memory_session_id) ON DELETE CASCADE ON UPDATE CASCADE
        )
      `),this.db.run(`
        INSERT INTO session_summaries_new
        SELECT id, memory_session_id, project, request, investigated, learned,
               completed, next_steps, files_read, files_edited, notes,
               prompt_number, discovery_tokens, created_at, created_at_epoch
        FROM session_summaries
      `),this.db.run("DROP TRIGGER IF EXISTS session_summaries_ai"),this.db.run("DROP TRIGGER IF EXISTS session_summaries_ad"),this.db.run("DROP TRIGGER IF EXISTS session_summaries_au"),this.db.run("DROP TABLE session_summaries"),this.db.run("ALTER TABLE session_summaries_new RENAME TO session_summaries"),this.db.run(`
        CREATE INDEX idx_session_summaries_sdk_session ON session_summaries(memory_session_id);
        CREATE INDEX idx_session_summaries_project ON session_summaries(project);
        CREATE INDEX idx_session_summaries_created ON session_summaries(created_at_epoch DESC);
      `),this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='session_summaries_fts'").all().length>0&&this.db.run(`
          CREATE TRIGGER IF NOT EXISTS session_summaries_ai AFTER INSERT ON session_summaries BEGIN
            INSERT INTO session_summaries_fts(rowid, request, investigated, learned, completed, next_steps, notes)
            VALUES (new.id, new.request, new.investigated, new.learned, new.completed, new.next_steps, new.notes);
          END;

          CREATE TRIGGER IF NOT EXISTS session_summaries_ad AFTER DELETE ON session_summaries BEGIN
            INSERT INTO session_summaries_fts(session_summaries_fts, rowid, request, investigated, learned, completed, next_steps, notes)
            VALUES('delete', old.id, old.request, old.investigated, old.learned, old.completed, old.next_steps, old.notes);
          END;

          CREATE TRIGGER IF NOT EXISTS session_summaries_au AFTER UPDATE ON session_summaries BEGIN
            INSERT INTO session_summaries_fts(session_summaries_fts, rowid, request, investigated, learned, completed, next_steps, notes)
            VALUES('delete', old.id, old.request, old.investigated, old.learned, old.completed, old.next_steps, old.notes);
            INSERT INTO session_summaries_fts(rowid, request, investigated, learned, completed, next_steps, notes)
            VALUES (new.id, new.request, new.investigated, new.learned, new.completed, new.next_steps, new.notes);
          END;
        `),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(21,new Date().toISOString()),this.db.run("COMMIT"),this.db.run("PRAGMA foreign_keys = ON"),l.debug("DB","Successfully added ON UPDATE CASCADE to FK constraints")}catch(t){throw this.db.run("ROLLBACK"),this.db.run("PRAGMA foreign_keys = ON"),t}}}addSessionSourceColumn(){if(!this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(22))try{this.db.prepare("PRAGMA table_info(sdk_sessions)").all().some(n=>n.name==="source")||(this.db.run("ALTER TABLE sdk_sessions ADD COLUMN source TEXT NOT NULL DEFAULT 'claude-code'"),this.db.run("CREATE INDEX IF NOT EXISTS idx_sdk_sessions_source ON sdk_sessions(source)"),l.info("DB","Added source column to sdk_sessions")),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(22,new Date().toISOString())}catch(t){l.error("DB","Failed to add source column to sdk_sessions",{},t)}}createTasksTable(){this.db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='tasks'").all().length>0||(this.db.run(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'todo',
        priority TEXT DEFAULT 'medium',
        category TEXT,
        created_at_epoch INTEGER NOT NULL,
        updated_at_epoch INTEGER NOT NULL,
        completed_at_epoch INTEGER
      )
    `),this.db.run("CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(project, status)"),l.info("DB","Created tasks table for Kanban board"))}createTagsSystem(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(23))return;if(this.db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='tags'").all().length>0){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(23,new Date().toISOString());return}l.debug("DB","Creating tags system tables"),this.db.run(`
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        color TEXT DEFAULT '#6366f1',
        is_system INTEGER DEFAULT 0,
        created_at_epoch INTEGER NOT NULL
      )
    `),this.db.run(`
      CREATE TABLE IF NOT EXISTS item_tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        item_type TEXT NOT NULL,
        item_id INTEGER NOT NULL,
        created_at_epoch INTEGER NOT NULL,
        UNIQUE(tag_id, item_type, item_id)
      )
    `),this.db.run("CREATE INDEX IF NOT EXISTS idx_item_tags_item ON item_tags(item_type, item_id)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_item_tags_tag ON item_tags(tag_id)");let s=Date.now(),n=[["bug","#ef4444"],["todo","#f59e0b"],["idea","#8b5cf6"],["learning","#06b6d4"],["decision","#3b82f6"],["feature","#10b981"],["fix","#f97316"],["refactor","#6366f1"],["performance","#ec4899"],["security","#dc2626"],["devops","#64748b"],["docs","#84cc16"]],o=this.db.prepare("INSERT OR IGNORE INTO tags (name, color, is_system, created_at_epoch) VALUES (?, ?, 1, ?)");for(let[a,d]of n)o.run(a,d,s);let i=this.db.query("PRAGMA table_info(tasks)").all();i.length>0&&(i.some(a=>a.name==="observation_id")||this.db.run("ALTER TABLE tasks ADD COLUMN observation_id INTEGER REFERENCES observations(id)"),i.some(a=>a.name==="summary_id")||this.db.run("ALTER TABLE tasks ADD COLUMN summary_id INTEGER REFERENCES session_summaries(id)")),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(23,new Date().toISOString()),l.info("DB","Created tags system tables and seeded 12 system tags")}updateMemorySessionId(e,t){this.db.prepare(`
      UPDATE sdk_sessions
      SET memory_session_id = ?
      WHERE id = ?
    `).run(t,e)}ensureMemorySessionIdRegistered(e,t){let s=this.db.prepare(`
      SELECT id, memory_session_id FROM sdk_sessions WHERE id = ?
    `).get(e);if(!s)throw new Error(`Session ${e} not found in sdk_sessions`);s.memory_session_id!==t&&(this.db.prepare(`
        UPDATE sdk_sessions SET memory_session_id = ? WHERE id = ?
      `).run(t,e),l.info("DB","Registered memory_session_id before storage (FK fix)",{sessionDbId:e,oldId:s.memory_session_id,newId:t}))}getRecentSummaries(e,t=10){return this.db.prepare(`
      SELECT
        request, investigated, learned, completed, next_steps,
        files_read, files_edited, notes, prompt_number, created_at
      FROM session_summaries
      WHERE project = ?
      ORDER BY created_at_epoch DESC
      LIMIT ?
    `).all(e,t)}getRecentSummariesWithSessionInfo(e,t=3){return this.db.prepare(`
      SELECT
        memory_session_id, request, learned, completed, next_steps,
        prompt_number, created_at
      FROM session_summaries
      WHERE project = ?
      ORDER BY created_at_epoch DESC
      LIMIT ?
    `).all(e,t)}getRecentObservations(e,t=20){return this.db.prepare(`
      SELECT type, text, prompt_number, created_at
      FROM observations
      WHERE project = ?
      ORDER BY created_at_epoch DESC
      LIMIT ?
    `).all(e,t)}getAllRecentObservations(e=100){return this.db.prepare(`
      SELECT id, type, title, subtitle, text, project, prompt_number, created_at, created_at_epoch
      FROM observations
      ORDER BY created_at_epoch DESC
      LIMIT ?
    `).all(e)}getAllRecentSummaries(e=50){return this.db.prepare(`
      SELECT id, request, investigated, learned, completed, next_steps,
             files_read, files_edited, notes, project, prompt_number,
             created_at, created_at_epoch
      FROM session_summaries
      ORDER BY created_at_epoch DESC
      LIMIT ?
    `).all(e)}getAllRecentUserPrompts(e=100){return this.db.prepare(`
      SELECT
        up.id,
        up.content_session_id,
        s.project,
        up.prompt_number,
        up.prompt_text,
        up.created_at,
        up.created_at_epoch
      FROM user_prompts up
      LEFT JOIN sdk_sessions s ON up.content_session_id = s.content_session_id
      ORDER BY up.created_at_epoch DESC
      LIMIT ?
    `).all(e)}getAllProjects(){return this.db.prepare(`
      SELECT DISTINCT project
      FROM sdk_sessions
      WHERE project IS NOT NULL AND project != ''
      ORDER BY project ASC
    `).all().map(s=>s.project)}getLatestUserPrompt(e){return this.db.prepare(`
      SELECT
        up.*,
        s.memory_session_id,
        s.project
      FROM user_prompts up
      JOIN sdk_sessions s ON up.content_session_id = s.content_session_id
      WHERE up.content_session_id = ?
      ORDER BY up.created_at_epoch DESC
      LIMIT 1
    `).get(e)}getRecentSessionsWithStatus(e,t=3){return this.db.prepare(`
      SELECT * FROM (
        SELECT
          s.memory_session_id,
          s.status,
          s.started_at,
          s.started_at_epoch,
          s.user_prompt,
          CASE WHEN sum.memory_session_id IS NOT NULL THEN 1 ELSE 0 END as has_summary
        FROM sdk_sessions s
        LEFT JOIN session_summaries sum ON s.memory_session_id = sum.memory_session_id
        WHERE s.project = ? AND s.memory_session_id IS NOT NULL
        GROUP BY s.memory_session_id
        ORDER BY s.started_at_epoch DESC
        LIMIT ?
      )
      ORDER BY started_at_epoch ASC
    `).all(e,t)}getObservationsForSession(e){return this.db.prepare(`
      SELECT title, subtitle, type, prompt_number
      FROM observations
      WHERE memory_session_id = ?
      ORDER BY created_at_epoch ASC
    `).all(e)}getObservationById(e){return this.db.prepare(`
      SELECT *
      FROM observations
      WHERE id = ?
    `).get(e)||null}getObservationsByIds(e,t={}){if(e.length===0)return[];let{orderBy:s="date_desc",limit:n,project:o,type:i,concepts:a,files:d}=t,p=s==="date_asc"?"ASC":"DESC",u=n?`LIMIT ${n}`:"",m=e.map(()=>"?").join(","),T=[...e],E=[];if(o&&(E.push("project = ?"),T.push(o)),i)if(Array.isArray(i)){let _=i.map(()=>"?").join(",");E.push(`type IN (${_})`),T.push(...i)}else E.push("type = ?"),T.push(i);if(a){let _=Array.isArray(a)?a:[a],N=_.map(()=>"EXISTS (SELECT 1 FROM json_each(concepts) WHERE value = ?)");T.push(..._),E.push(`(${N.join(" OR ")})`)}if(d){let _=Array.isArray(d)?d:[d],N=_.map(()=>"(EXISTS (SELECT 1 FROM json_each(files_read) WHERE value LIKE ?) OR EXISTS (SELECT 1 FROM json_each(files_modified) WHERE value LIKE ?))");_.forEach(R=>{T.push(`%${R}%`,`%${R}%`)}),E.push(`(${N.join(" OR ")})`)}let g=E.length>0?`WHERE id IN (${m}) AND ${E.join(" AND ")}`:`WHERE id IN (${m})`;return this.db.prepare(`
      SELECT *
      FROM observations
      ${g}
      ORDER BY created_at_epoch ${p}
      ${u}
    `).all(...T)}getSummaryForSession(e){return this.db.prepare(`
      SELECT
        request, investigated, learned, completed, next_steps,
        files_read, files_edited, notes, prompt_number, created_at,
        created_at_epoch
      FROM session_summaries
      WHERE memory_session_id = ?
      ORDER BY created_at_epoch DESC
      LIMIT 1
    `).get(e)||null}getFilesForSession(e){let s=this.db.prepare(`
      SELECT files_read, files_modified
      FROM observations
      WHERE memory_session_id = ?
    `).all(e),n=new Set,o=new Set;for(let i of s){if(i.files_read){let a=JSON.parse(i.files_read);Array.isArray(a)&&a.forEach(d=>n.add(d))}if(i.files_modified){let a=JSON.parse(i.files_modified);Array.isArray(a)&&a.forEach(d=>o.add(d))}}return{filesRead:Array.from(n),filesModified:Array.from(o)}}getSessionById(e){return this.db.prepare(`
      SELECT id, content_session_id, memory_session_id, project, user_prompt
      FROM sdk_sessions
      WHERE id = ?
      LIMIT 1
    `).get(e)||null}getSdkSessionsBySessionIds(e){if(e.length===0)return[];let t=e.map(()=>"?").join(",");return this.db.prepare(`
      SELECT id, content_session_id, memory_session_id, project, user_prompt,
             started_at, started_at_epoch, completed_at, completed_at_epoch, status
      FROM sdk_sessions
      WHERE memory_session_id IN (${t})
      ORDER BY started_at_epoch DESC
    `).all(...e)}getPromptNumberFromUserPrompts(e){return this.db.prepare(`
      SELECT COUNT(*) as count FROM user_prompts WHERE content_session_id = ?
    `).get(e).count}createSDKSession(e,t,s,n="claude-code"){let o=new Date,i=o.getTime(),a=this.db.prepare(`
      SELECT id FROM sdk_sessions WHERE content_session_id = ?
    `).get(e);return a?(t&&this.db.prepare(`
          UPDATE sdk_sessions SET project = ?
          WHERE content_session_id = ? AND (project IS NULL OR project = '')
        `).run(t,e),a.id):(this.db.prepare(`
      INSERT INTO sdk_sessions
      (content_session_id, memory_session_id, project, user_prompt, started_at, started_at_epoch, status, source)
      VALUES (?, NULL, ?, ?, ?, ?, 'active', ?)
    `).run(e,t,s,o.toISOString(),i,n),this.db.prepare("SELECT id FROM sdk_sessions WHERE content_session_id = ?").get(e).id)}saveUserPrompt(e,t,s){let n=new Date,o=n.getTime();return this.db.prepare(`
      INSERT INTO user_prompts
      (content_session_id, prompt_number, prompt_text, created_at, created_at_epoch)
      VALUES (?, ?, ?, ?, ?)
    `).run(e,t,s,n.toISOString(),o).lastInsertRowid}getUserPrompt(e,t){return this.db.prepare(`
      SELECT prompt_text
      FROM user_prompts
      WHERE content_session_id = ? AND prompt_number = ?
      LIMIT 1
    `).get(e,t)?.prompt_text??null}storeObservation(e,t,s,n,o=0,i){let a=i??Date.now(),d=new Date(a).toISOString(),u=this.db.prepare(`
      INSERT INTO observations
      (memory_session_id, project, type, title, subtitle, facts, narrative, concepts,
       files_read, files_modified, prompt_number, discovery_tokens, created_at, created_at_epoch)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(e,t,s.type,s.title,s.subtitle,JSON.stringify(s.facts),s.narrative,JSON.stringify(s.concepts),JSON.stringify(s.files_read),JSON.stringify(s.files_modified),n||null,o,d,a);return{id:Number(u.lastInsertRowid),createdAtEpoch:a}}storeSummary(e,t,s,n,o=0,i){let a=i??Date.now(),d=new Date(a).toISOString(),u=this.db.prepare(`
      INSERT INTO session_summaries
      (memory_session_id, project, request, investigated, learned, completed,
       next_steps, notes, prompt_number, discovery_tokens, created_at, created_at_epoch)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(e,t,s.request,s.investigated,s.learned,s.completed,s.next_steps,s.notes,n||null,o,d,a);return{id:Number(u.lastInsertRowid),createdAtEpoch:a}}storeObservations(e,t,s,n,o,i=0,a){let d=a??Date.now(),p=new Date(d).toISOString();return this.db.transaction(()=>{let m=[],T=this.db.prepare(`
        INSERT INTO observations
        (memory_session_id, project, type, title, subtitle, facts, narrative, concepts,
         files_read, files_modified, prompt_number, discovery_tokens, created_at, created_at_epoch)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);for(let g of s){let b=T.run(e,t,g.type,g.title,g.subtitle,JSON.stringify(g.facts),g.narrative,JSON.stringify(g.concepts),JSON.stringify(g.files_read),JSON.stringify(g.files_modified),o||null,i,p,d);m.push(Number(b.lastInsertRowid))}let E=null;if(n){let b=this.db.prepare(`
          INSERT INTO session_summaries
          (memory_session_id, project, request, investigated, learned, completed,
           next_steps, notes, prompt_number, discovery_tokens, created_at, created_at_epoch)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(e,t,n.request,n.investigated,n.learned,n.completed,n.next_steps,n.notes,o||null,i,p,d);E=Number(b.lastInsertRowid)}return{observationIds:m,summaryId:E,createdAtEpoch:d}})()}storeObservationsAndMarkComplete(e,t,s,n,o,i,a,d=0,p){let u=p??Date.now(),m=new Date(u).toISOString();return this.db.transaction(()=>{let E=[],g=this.db.prepare(`
        INSERT INTO observations
        (memory_session_id, project, type, title, subtitle, facts, narrative, concepts,
         files_read, files_modified, prompt_number, discovery_tokens, created_at, created_at_epoch)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);for(let N of s){let R=g.run(e,t,N.type,N.title,N.subtitle,JSON.stringify(N.facts),N.narrative,JSON.stringify(N.concepts),JSON.stringify(N.files_read),JSON.stringify(N.files_modified),a||null,d,m,u);E.push(Number(R.lastInsertRowid))}let b;if(n){let R=this.db.prepare(`
          INSERT INTO session_summaries
          (memory_session_id, project, request, investigated, learned, completed,
           next_steps, notes, prompt_number, discovery_tokens, created_at, created_at_epoch)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(e,t,n.request,n.investigated,n.learned,n.completed,n.next_steps,n.notes,a||null,d,m,u);b=Number(R.lastInsertRowid)}return this.db.prepare(`
        UPDATE pending_messages
        SET
          status = 'processed',
          completed_at_epoch = ?,
          tool_input = NULL,
          tool_response = NULL
        WHERE id = ? AND status = 'processing'
      `).run(u,o),{observationIds:E,summaryId:b,createdAtEpoch:u}})()}getSessionSummariesByIds(e,t={}){if(e.length===0)return[];let{orderBy:s="date_desc",limit:n,project:o}=t,i=s==="date_asc"?"ASC":"DESC",a=n?`LIMIT ${n}`:"",d=e.map(()=>"?").join(","),p=[...e],u=o?`WHERE id IN (${d}) AND project = ?`:`WHERE id IN (${d})`;return o&&p.push(o),this.db.prepare(`
      SELECT * FROM session_summaries
      ${u}
      ORDER BY created_at_epoch ${i}
      ${a}
    `).all(...p)}getUserPromptsByIds(e,t={}){if(e.length===0)return[];let{orderBy:s="date_desc",limit:n,project:o}=t,i=s==="date_asc"?"ASC":"DESC",a=n?`LIMIT ${n}`:"",d=e.map(()=>"?").join(","),p=[...e],u=o?"AND s.project = ?":"";return o&&p.push(o),this.db.prepare(`
      SELECT
        up.*,
        s.project,
        s.memory_session_id
      FROM user_prompts up
      JOIN sdk_sessions s ON up.content_session_id = s.content_session_id
      WHERE up.id IN (${d}) ${u}
      ORDER BY up.created_at_epoch ${i}
      ${a}
    `).all(...p)}getTimelineAroundTimestamp(e,t=10,s=10,n){return this.getTimelineAroundObservation(null,e,t,s,n)}getTimelineAroundObservation(e,t,s=10,n=10,o){let i=o?"AND project = ?":"",a=o?[o]:[],d,p;if(e!==null){let _=`
        SELECT id, created_at_epoch
        FROM observations
        WHERE id <= ? ${i}
        ORDER BY id DESC
        LIMIT ?
      `,N=`
        SELECT id, created_at_epoch
        FROM observations
        WHERE id >= ? ${i}
        ORDER BY id ASC
        LIMIT ?
      `;try{let R=this.db.prepare(_).all(e,...a,s+1),h=this.db.prepare(N).all(e,...a,n+1);if(R.length===0&&h.length===0)return{observations:[],sessions:[],prompts:[]};d=R.length>0?R[R.length-1].created_at_epoch:t,p=h.length>0?h[h.length-1].created_at_epoch:t}catch(R){return l.error("DB","Error getting boundary observations",void 0,{error:R,project:o}),{observations:[],sessions:[],prompts:[]}}}else{let _=`
        SELECT created_at_epoch
        FROM observations
        WHERE created_at_epoch <= ? ${i}
        ORDER BY created_at_epoch DESC
        LIMIT ?
      `,N=`
        SELECT created_at_epoch
        FROM observations
        WHERE created_at_epoch >= ? ${i}
        ORDER BY created_at_epoch ASC
        LIMIT ?
      `;try{let R=this.db.prepare(_).all(t,...a,s),h=this.db.prepare(N).all(t,...a,n+1);if(R.length===0&&h.length===0)return{observations:[],sessions:[],prompts:[]};d=R.length>0?R[R.length-1].created_at_epoch:t,p=h.length>0?h[h.length-1].created_at_epoch:t}catch(R){return l.error("DB","Error getting boundary timestamps",void 0,{error:R,project:o}),{observations:[],sessions:[],prompts:[]}}}let u=`
      SELECT *
      FROM observations
      WHERE created_at_epoch >= ? AND created_at_epoch <= ? ${i}
      ORDER BY created_at_epoch ASC
    `,m=`
      SELECT *
      FROM session_summaries
      WHERE created_at_epoch >= ? AND created_at_epoch <= ? ${i}
      ORDER BY created_at_epoch ASC
    `,T=`
      SELECT up.*, s.project, s.memory_session_id
      FROM user_prompts up
      JOIN sdk_sessions s ON up.content_session_id = s.content_session_id
      WHERE up.created_at_epoch >= ? AND up.created_at_epoch <= ? ${i.replace("project","s.project")}
      ORDER BY up.created_at_epoch ASC
    `,E=this.db.prepare(u).all(d,p,...a),g=this.db.prepare(m).all(d,p,...a),b=this.db.prepare(T).all(d,p,...a);return{observations:E,sessions:g.map(_=>({id:_.id,memory_session_id:_.memory_session_id,project:_.project,request:_.request,completed:_.completed,next_steps:_.next_steps,created_at:_.created_at,created_at_epoch:_.created_at_epoch})),prompts:b.map(_=>({id:_.id,content_session_id:_.content_session_id,prompt_number:_.prompt_number,prompt_text:_.prompt_text,project:_.project,created_at:_.created_at,created_at_epoch:_.created_at_epoch}))}}getPromptById(e){return this.db.prepare(`
      SELECT
        p.id,
        p.content_session_id,
        p.prompt_number,
        p.prompt_text,
        s.project,
        p.created_at,
        p.created_at_epoch
      FROM user_prompts p
      LEFT JOIN sdk_sessions s ON p.content_session_id = s.content_session_id
      WHERE p.id = ?
      LIMIT 1
    `).get(e)||null}getPromptsByIds(e){if(e.length===0)return[];let t=e.map(()=>"?").join(",");return this.db.prepare(`
      SELECT
        p.id,
        p.content_session_id,
        p.prompt_number,
        p.prompt_text,
        s.project,
        p.created_at,
        p.created_at_epoch
      FROM user_prompts p
      LEFT JOIN sdk_sessions s ON p.content_session_id = s.content_session_id
      WHERE p.id IN (${t})
      ORDER BY p.created_at_epoch DESC
    `).all(...e)}getSessionSummaryById(e){return this.db.prepare(`
      SELECT
        id,
        memory_session_id,
        content_session_id,
        project,
        user_prompt,
        request_summary,
        learned_summary,
        status,
        created_at,
        created_at_epoch
      FROM sdk_sessions
      WHERE id = ?
      LIMIT 1
    `).get(e)||null}getOrCreateManualSession(e){let t=`manual-${e}`,s=`manual-content-${e}`;if(this.db.prepare("SELECT memory_session_id FROM sdk_sessions WHERE memory_session_id = ?").get(t))return t;let o=new Date;return this.db.prepare(`
      INSERT INTO sdk_sessions (memory_session_id, content_session_id, project, started_at, started_at_epoch, status, source)
      VALUES (?, ?, ?, ?, ?, 'active', 'manual')
    `).run(t,s,e,o.toISOString(),o.getTime()),l.info("SESSION","Created manual session",{memorySessionId:t,project:e}),t}close(){this.db.close()}importSdkSession(e){let t=this.db.prepare("SELECT id FROM sdk_sessions WHERE content_session_id = ?").get(e.content_session_id);return t?{imported:!1,id:t.id}:{imported:!0,id:this.db.prepare(`
      INSERT INTO sdk_sessions (
        content_session_id, memory_session_id, project, user_prompt,
        started_at, started_at_epoch, completed_at, completed_at_epoch, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(e.content_session_id,e.memory_session_id,e.project,e.user_prompt,e.started_at,e.started_at_epoch,e.completed_at,e.completed_at_epoch,e.status).lastInsertRowid}}importSessionSummary(e){let t=this.db.prepare("SELECT id FROM session_summaries WHERE memory_session_id = ?").get(e.memory_session_id);return t?{imported:!1,id:t.id}:{imported:!0,id:this.db.prepare(`
      INSERT INTO session_summaries (
        memory_session_id, project, request, investigated, learned,
        completed, next_steps, files_read, files_edited, notes,
        prompt_number, discovery_tokens, created_at, created_at_epoch
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(e.memory_session_id,e.project,e.request,e.investigated,e.learned,e.completed,e.next_steps,e.files_read,e.files_edited,e.notes,e.prompt_number,e.discovery_tokens||0,e.created_at,e.created_at_epoch).lastInsertRowid}}importObservation(e){let t=this.db.prepare(`
      SELECT id FROM observations
      WHERE memory_session_id = ? AND title = ? AND created_at_epoch = ?
    `).get(e.memory_session_id,e.title,e.created_at_epoch);return t?{imported:!1,id:t.id}:{imported:!0,id:this.db.prepare(`
      INSERT INTO observations (
        memory_session_id, project, text, type, title, subtitle,
        facts, narrative, concepts, files_read, files_modified,
        prompt_number, discovery_tokens, created_at, created_at_epoch
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(e.memory_session_id,e.project,e.text,e.type,e.title,e.subtitle,e.facts,e.narrative,e.concepts,e.files_read,e.files_modified,e.prompt_number,e.discovery_tokens||0,e.created_at,e.created_at_epoch).lastInsertRowid}}importUserPrompt(e){let t=this.db.prepare(`
      SELECT id FROM user_prompts
      WHERE content_session_id = ? AND prompt_number = ?
    `).get(e.content_session_id,e.prompt_number);return t?{imported:!1,id:t.id}:{imported:!0,id:this.db.prepare(`
      INSERT INTO user_prompts (
        content_session_id, prompt_number, prompt_text,
        created_at, created_at_epoch
      ) VALUES (?, ?, ?, ?, ?)
    `).run(e.content_session_id,e.prompt_number,e.prompt_text,e.created_at,e.created_at_epoch).lastInsertRowid}}createLoopTables(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(24))return;if(this.db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='loop_configs'").all().length>0){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(24,new Date().toISOString());return}l.debug("DB","Creating loop_configs and loop_iterations tables"),this.db.run(`
      CREATE TABLE IF NOT EXISTS loop_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project TEXT NOT NULL UNIQUE,
        enabled INTEGER DEFAULT 0,
        mode TEXT DEFAULT 'adaptive',
        max_iterations INTEGER DEFAULT 10,
        task_description TEXT,
        success_criteria TEXT,
        completion_promises TEXT,
        promise_logic TEXT DEFAULT 'any',
        iteration_context_tokens INTEGER DEFAULT 500,
        auto_compact_threshold REAL DEFAULT 0.8,
        created_at_epoch INTEGER NOT NULL,
        updated_at_epoch INTEGER NOT NULL
      )
    `),this.db.run(`
      CREATE TABLE IF NOT EXISTS loop_iterations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        loop_config_id INTEGER NOT NULL REFERENCES loop_configs(id),
        iteration_number INTEGER NOT NULL,
        session_id TEXT,
        mode_used TEXT,
        status TEXT DEFAULT 'pending',
        context_injected TEXT,
        observations_count INTEGER DEFAULT 0,
        key_findings TEXT,
        started_at_epoch INTEGER,
        completed_at_epoch INTEGER
      )
    `),this.db.run("CREATE INDEX IF NOT EXISTS idx_loop_iterations_config ON loop_iterations(loop_config_id)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_loop_iterations_status ON loop_iterations(status)"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(24,new Date().toISOString()),l.info("DB","Created loop_configs and loop_iterations tables")}ensureTasksObservationIdColumn(){if(this.db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='tasks'").all().length===0)return;let t=this.db.query("PRAGMA table_info(tasks)").all();t.some(i=>i.name==="observation_id")||this.db.run("ALTER TABLE tasks ADD COLUMN observation_id INTEGER REFERENCES observations(id)"),t.some(i=>i.name==="summary_id")||this.db.run("ALTER TABLE tasks ADD COLUMN summary_id INTEGER REFERENCES session_summaries(id)"),this.db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='tags'").all().length>0&&this.db.prepare("INSERT OR IGNORE INTO tags (name, color, is_system, created_at_epoch) VALUES (?, ?, 1, ?)").run("planned-feature","#f59e0b",Date.now())}createTerminalSessionsTable(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(25))return;if(this.db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='terminal_sessions'").all().length>0){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(25,new Date().toISOString());return}l.debug("DB","Creating terminal_sessions table"),this.db.run(`
      CREATE TABLE IF NOT EXISTS terminal_sessions (
        id TEXT PRIMARY KEY,
        project TEXT,
        shell TEXT NOT NULL,
        cwd TEXT NOT NULL,
        cols INTEGER DEFAULT 80,
        rows INTEGER DEFAULT 24,
        created_at_epoch INTEGER NOT NULL,
        destroyed_at_epoch INTEGER,
        recording_path TEXT
      )
    `),this.db.run("CREATE INDEX IF NOT EXISTS idx_terminal_sessions_project ON terminal_sessions(project)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_terminal_sessions_created ON terminal_sessions(created_at_epoch DESC)"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(25,new Date().toISOString()),l.info("DB","Created terminal_sessions table")}createAutomationTables(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(26))return;if(this.db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='automation_jobs'").all().length>0){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(26,new Date().toISOString());return}l.debug("DB","Creating automation_jobs and automation_runs tables"),this.db.run(`
      CREATE TABLE IF NOT EXISTS automation_jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('cron','webhook','trigger','one-time')),
        project TEXT NOT NULL,
        enabled INTEGER DEFAULT 1,
        cron_expression TEXT,
        timezone TEXT DEFAULT 'UTC',
        webhook_path TEXT UNIQUE,
        webhook_secret TEXT,
        trigger_event TEXT,
        trigger_conditions TEXT,
        task_description TEXT NOT NULL,
        working_directory TEXT,
        model TEXT DEFAULT 'sonnet',
        permission_mode TEXT DEFAULT 'plan',
        max_runtime_seconds INTEGER DEFAULT 3600,
        retry_on_failure INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 0,
        last_run_at_epoch INTEGER,
        next_run_at_epoch INTEGER,
        total_runs INTEGER DEFAULT 0,
        successful_runs INTEGER DEFAULT 0,
        failed_runs INTEGER DEFAULT 0,
        created_at_epoch INTEGER NOT NULL,
        updated_at_epoch INTEGER NOT NULL
      )
    `),this.db.run("CREATE INDEX IF NOT EXISTS idx_automation_jobs_project ON automation_jobs(project)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_automation_jobs_type ON automation_jobs(type)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_automation_jobs_enabled ON automation_jobs(enabled)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_automation_jobs_webhook ON automation_jobs(webhook_path)"),this.db.run(`
      CREATE TABLE IF NOT EXISTS automation_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id INTEGER NOT NULL REFERENCES automation_jobs(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'pending',
        triggered_by TEXT NOT NULL,
        trigger_payload TEXT,
        content_session_id TEXT,
        terminal_session_id TEXT,
        output_log TEXT,
        error_message TEXT,
        observations_created INTEGER DEFAULT 0,
        started_at_epoch INTEGER NOT NULL,
        completed_at_epoch INTEGER,
        duration_ms INTEGER,
        retry_number INTEGER DEFAULT 0
      )
    `),this.db.run("CREATE INDEX IF NOT EXISTS idx_automation_runs_job ON automation_runs(job_id)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_automation_runs_status ON automation_runs(status)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_automation_runs_started ON automation_runs(started_at_epoch DESC)"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(26,new Date().toISOString()),l.info("DB","Created automation_jobs and automation_runs tables")}createTerminalRecordingsTable(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(27))return;if(this.db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='terminal_recordings'").all().length>0){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(27,new Date().toISOString());return}l.debug("DB","Creating terminal_recordings table"),this.db.run(`
      CREATE TABLE IF NOT EXISTS terminal_recordings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        terminal_session_id TEXT REFERENCES terminal_sessions(id),
        file_path TEXT NOT NULL,
        duration_ms INTEGER,
        size_bytes INTEGER,
        observation_ids TEXT,
        created_at_epoch INTEGER NOT NULL
      )
    `),this.db.run("CREATE INDEX IF NOT EXISTS idx_terminal_recordings_session ON terminal_recordings(terminal_session_id)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_terminal_recordings_created ON terminal_recordings(created_at_epoch DESC)"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(27,new Date().toISOString()),l.info("DB","Created terminal_recordings table")}};var Re=C(require("path"),1);function Ne(r){if(!r||r.trim()==="")return l.warn("PROJECT_NAME","Empty cwd provided, using fallback",{cwd:r}),"unknown-project";let e=Re.default.basename(r);if(e===""){if(process.platform==="win32"){let s=r.match(/^([A-Z]):\\/i);if(s){let o=`drive-${s[1].toUpperCase()}`;return l.info("PROJECT_NAME","Drive root detected",{cwd:r,projectName:o}),o}}return l.warn("PROJECT_NAME","Root directory detected, using fallback",{cwd:r}),"unknown-project"}return e}var be=C(require("path"),1),fe=require("os");var k=require("fs"),B=require("path");var S=class r{static instance=null;activeMode=null;modesDir;constructor(){let e=Te(),t=[(0,B.join)(e,"modes"),(0,B.join)(e,"..","plugin","modes")],s=t.find(n=>(0,k.existsSync)(n));this.modesDir=s||t[0]}static getInstance(){return r.instance||(r.instance=new r),r.instance}parseInheritance(e){let t=e.split("--");if(t.length===1)return{hasParent:!1,parentId:"",overrideId:""};if(t.length>2)throw new Error(`Invalid mode inheritance: ${e}. Only one level of inheritance supported (parent--override)`);return{hasParent:!0,parentId:t[0],overrideId:e}}isPlainObject(e){return e!==null&&typeof e=="object"&&!Array.isArray(e)}deepMerge(e,t){let s={...e};for(let n in t){let o=t[n],i=e[n];this.isPlainObject(o)&&this.isPlainObject(i)?s[n]=this.deepMerge(i,o):s[n]=o}return s}loadModeFile(e){let t=(0,B.join)(this.modesDir,`${e}.json`);if(!(0,k.existsSync)(t))throw new Error(`Mode file not found: ${t}`);let s=(0,k.readFileSync)(t,"utf-8");return JSON.parse(s)}loadMode(e){let t=this.parseInheritance(e);if(!t.hasParent)try{let d=this.loadModeFile(e);return this.activeMode=d,l.debug("SYSTEM",`Loaded mode: ${d.name} (${e})`,void 0,{types:d.observation_types.map(p=>p.id),concepts:d.observation_concepts.map(p=>p.id)}),d}catch{if(l.warn("SYSTEM",`Mode file not found: ${e}, falling back to 'code'`),e==="code")throw new Error("Critical: code.json mode file missing");return this.loadMode("code")}let{parentId:s,overrideId:n}=t,o;try{o=this.loadMode(s)}catch{l.warn("SYSTEM",`Parent mode '${s}' not found for ${e}, falling back to 'code'`),o=this.loadMode("code")}let i;try{i=this.loadModeFile(n),l.debug("SYSTEM",`Loaded override file: ${n} for parent ${s}`)}catch{return l.warn("SYSTEM",`Override file '${n}' not found, using parent mode '${s}' only`),this.activeMode=o,o}if(!i)return l.warn("SYSTEM",`Invalid override file: ${n}, using parent mode '${s}' only`),this.activeMode=o,o;let a=this.deepMerge(o,i);return this.activeMode=a,l.debug("SYSTEM",`Loaded mode with inheritance: ${a.name} (${e} = ${s} + ${n})`,void 0,{parent:s,override:n,types:a.observation_types.map(d=>d.id),concepts:a.observation_concepts.map(d=>d.id)}),a}getActiveMode(){if(!this.activeMode)throw new Error("No mode loaded. Call loadMode() first.");return this.activeMode}getObservationTypes(){return this.getActiveMode().observation_types}getObservationConcepts(){return this.getActiveMode().observation_concepts}getTypeIcon(e){return this.getObservationTypes().find(s=>s.id===e)?.emoji||"\u{1F4DD}"}getWorkEmoji(e){return this.getObservationTypes().find(s=>s.id===e)?.work_emoji||"\u{1F4DD}"}validateType(e){return this.getObservationTypes().some(t=>t.id===e)}getTypeLabel(e){return this.getObservationTypes().find(s=>s.id===e)?.label||e}};function q(){let r=be.default.join((0,fe.homedir)(),".ultrabrain","settings.json"),e=y.loadFromFile(r),t=e.ULTRABRAIN_MODE,s=t==="code"||t.startsWith("code--"),n,o;if(s)n=new Set(e.ULTRABRAIN_CONTEXT_OBSERVATION_TYPES.split(",").map(i=>i.trim()).filter(Boolean)),o=new Set(e.ULTRABRAIN_CONTEXT_OBSERVATION_CONCEPTS.split(",").map(i=>i.trim()).filter(Boolean));else{let i=S.getInstance().getActiveMode();n=new Set(i.observation_types.map(a=>a.id)),o=new Set(i.observation_concepts.map(a=>a.id))}return{totalObservationCount:parseInt(e.ULTRABRAIN_CONTEXT_OBSERVATIONS,10),fullObservationCount:parseInt(e.ULTRABRAIN_CONTEXT_FULL_COUNT,10),sessionCount:parseInt(e.ULTRABRAIN_CONTEXT_SESSION_COUNT,10),showReadTokens:e.ULTRABRAIN_CONTEXT_SHOW_READ_TOKENS==="true",showWorkTokens:e.ULTRABRAIN_CONTEXT_SHOW_WORK_TOKENS==="true",showSavingsAmount:e.ULTRABRAIN_CONTEXT_SHOW_SAVINGS_AMOUNT==="true",showSavingsPercent:e.ULTRABRAIN_CONTEXT_SHOW_SAVINGS_PERCENT==="true",observationTypes:n,observationConcepts:o,fullObservationField:e.ULTRABRAIN_CONTEXT_FULL_FIELD,showLastSummary:e.ULTRABRAIN_CONTEXT_SHOW_LAST_SUMMARY==="true",showLastMessage:e.ULTRABRAIN_CONTEXT_SHOW_LAST_MESSAGE==="true"}}var c={reset:"\x1B[0m",bright:"\x1B[1m",dim:"\x1B[2m",cyan:"\x1B[36m",green:"\x1B[32m",yellow:"\x1B[33m",blue:"\x1B[34m",magenta:"\x1B[35m",gray:"\x1B[90m",red:"\x1B[31m"},Se=4,K=1;function J(r){let e=(r.title?.length||0)+(r.subtitle?.length||0)+(r.narrative?.length||0)+JSON.stringify(r.facts||[]).length;return Math.ceil(e/Se)}function z(r){let e=r.length,t=r.reduce((i,a)=>i+J(a),0),s=r.reduce((i,a)=>i+(a.discovery_tokens||0),0),n=s-t,o=s>0?Math.round(n/s*100):0;return{totalObservations:e,totalReadTokens:t,totalDiscoveryTokens:s,savings:n,savingsPercent:o}}function yt(r){return S.getInstance().getWorkEmoji(r)}function D(r,e){let t=J(r),s=r.discovery_tokens||0,n=yt(r.type),o=s>0?`${n} ${s.toLocaleString()}`:"-";return{readTokens:t,discoveryTokens:s,discoveryDisplay:o,workEmoji:n}}function P(r){return r.showReadTokens||r.showWorkTokens||r.showSavingsAmount||r.showSavingsPercent}var he=C(require("path"),1),G=require("fs");function Q(r,e,t){let s=Array.from(t.observationTypes),n=s.map(()=>"?").join(","),o=Array.from(t.observationConcepts),i=o.map(()=>"?").join(",");return r.db.prepare(`
    SELECT
      id, memory_session_id, type, title, subtitle, narrative,
      facts, concepts, files_read, files_modified, discovery_tokens,
      created_at, created_at_epoch
    FROM observations
    WHERE project = ?
      AND type IN (${n})
      AND EXISTS (
        SELECT 1 FROM json_each(concepts)
        WHERE value IN (${i})
      )
    ORDER BY created_at_epoch DESC
    LIMIT ?
  `).all(e,...s,...o,t.totalObservationCount)}function Z(r,e,t){return r.db.prepare(`
    SELECT id, memory_session_id, request, investigated, learned, completed, next_steps, created_at, created_at_epoch
    FROM session_summaries
    WHERE project = ?
    ORDER BY created_at_epoch DESC
    LIMIT ?
  `).all(e,t.sessionCount+K)}function Ie(r,e,t){let s=Array.from(t.observationTypes),n=s.map(()=>"?").join(","),o=Array.from(t.observationConcepts),i=o.map(()=>"?").join(","),a=e.map(()=>"?").join(",");return r.db.prepare(`
    SELECT
      id, memory_session_id, type, title, subtitle, narrative,
      facts, concepts, files_read, files_modified, discovery_tokens,
      created_at, created_at_epoch, project
    FROM observations
    WHERE project IN (${a})
      AND type IN (${n})
      AND EXISTS (
        SELECT 1 FROM json_each(concepts)
        WHERE value IN (${i})
      )
    ORDER BY created_at_epoch DESC
    LIMIT ?
  `).all(...e,...s,...o,t.totalObservationCount)}function Oe(r,e,t){let s=e.map(()=>"?").join(",");return r.db.prepare(`
    SELECT id, memory_session_id, request, investigated, learned, completed, next_steps, created_at, created_at_epoch, project
    FROM session_summaries
    WHERE project IN (${s})
    ORDER BY created_at_epoch DESC
    LIMIT ?
  `).all(...e,t.sessionCount+K)}function vt(r){return r.replace(/\//g,"-")}function Dt(r){try{if(!(0,G.existsSync)(r))return{userMessage:"",assistantMessage:""};let e=(0,G.readFileSync)(r,"utf-8").trim();if(!e)return{userMessage:"",assistantMessage:""};let t=e.split(`
`).filter(n=>n.trim()),s="";for(let n=t.length-1;n>=0;n--)try{let o=t[n];if(!o.includes('"type":"assistant"'))continue;let i=JSON.parse(o);if(i.type==="assistant"&&i.message?.content&&Array.isArray(i.message.content)){let a="";for(let d of i.message.content)d.type==="text"&&(a+=d.text);if(a=a.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g,"").trim(),a){s=a;break}}}catch(o){l.debug("PARSER","Skipping malformed transcript line",{lineIndex:n},o);continue}return{userMessage:"",assistantMessage:s}}catch(e){return l.failure("WORKER","Failed to extract prior messages from transcript",{transcriptPath:r},e),{userMessage:"",assistantMessage:""}}}function ee(r,e,t,s){if(!e.showLastMessage||r.length===0)return{userMessage:"",assistantMessage:""};let n=r.find(d=>d.memory_session_id!==t);if(!n)return{userMessage:"",assistantMessage:""};let o=n.memory_session_id,i=vt(s),a=he.default.join(v,"projects",i,`${o}.jsonl`);return Dt(a)}function Ae(r,e){let t=e[0]?.id;return r.map((s,n)=>{let o=n===0?null:e[n+1];return{...s,displayEpoch:o?o.created_at_epoch:s.created_at_epoch,displayTime:o?o.created_at:s.created_at,shouldShowLink:s.id!==t}})}function te(r,e){let t=[...r.map(s=>({type:"observation",data:s})),...e.map(s=>({type:"summary",data:s}))];return t.sort((s,n)=>{let o=s.type==="observation"?s.data.created_at_epoch:s.data.displayEpoch,i=n.type==="observation"?n.data.created_at_epoch:n.data.displayEpoch;return o-i}),t}function Le(r,e){return new Set(r.slice(0,e).map(t=>t.id))}function Ce(){let r=new Date,e=r.toLocaleDateString("en-CA"),t=r.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",hour12:!0}).toLowerCase().replace(" ",""),s=r.toLocaleTimeString("en-US",{timeZoneName:"short"}).split(" ").pop();return`${e} ${t} ${s}`}function ye(r){return[`# [${r}] recent context, ${Ce()}`,""]}function ve(){return[`**Legend:** session-request | ${S.getInstance().getActiveMode().observation_types.map(t=>`${t.emoji} ${t.id}`).join(" | ")}`,""]}function De(){return["**Column Key**:","- **Read**: Tokens to read this observation (cost to learn it now)","- **Work**: Tokens spent on work that produced this record ( research, building, deciding)",""]}function Me(){return["**Context Index:** This semantic index (titles, types, files, tokens) is usually sufficient to understand past work.","","When you need implementation details, rationale, or debugging context:","- Use MCP tools (search, get_observations) to fetch full observations on-demand","- Critical types ( bugfix, decision) often need detailed fetching","- Trust this index over re-reading code for past decisions and learnings",""]}function Ue(r,e){let t=[];if(t.push("**Context Economics**:"),t.push(`- Loading: ${r.totalObservations} observations (${r.totalReadTokens.toLocaleString()} tokens to read)`),t.push(`- Work investment: ${r.totalDiscoveryTokens.toLocaleString()} tokens spent on research, building, and decisions`),r.totalDiscoveryTokens>0&&(e.showSavingsAmount||e.showSavingsPercent)){let s="- Your savings: ";e.showSavingsAmount&&e.showSavingsPercent?s+=`${r.savings.toLocaleString()} tokens (${r.savingsPercent}% reduction from reuse)`:e.showSavingsAmount?s+=`${r.savings.toLocaleString()} tokens`:s+=`${r.savingsPercent}% reduction from reuse`,t.push(s)}return t.push(""),t}function ke(r){return[`### ${r}`,""]}function xe(r){return[`**${r}**`,"| ID | Time | T | Title | Read | Work |","|----|------|---|-------|------|------|"]}function Fe(r,e,t){let s=r.title||"Untitled",n=S.getInstance().getTypeIcon(r.type),{readTokens:o,discoveryDisplay:i}=D(r,t),a=t.showReadTokens?`~${o}`:"",d=t.showWorkTokens?i:"";return`| #${r.id} | ${e||'"'} | ${n} | ${s} | ${a} | ${d} |`}function we(r,e,t,s){let n=[],o=r.title||"Untitled",i=S.getInstance().getTypeIcon(r.type),{readTokens:a,discoveryDisplay:d}=D(r,s);n.push(`**#${r.id}** ${e||'"'} ${i} **${o}**`),t&&(n.push(""),n.push(t),n.push(""));let p=[];return s.showReadTokens&&p.push(`Read: ~${a}`),s.showWorkTokens&&p.push(`Work: ${d}`),p.length>0&&n.push(p.join(", ")),n.push(""),n}function $e(r,e){let t=`${r.request||"Session started"} (${e})`;return[`**#S${r.id}** ${t}`,""]}function x(r,e){return e?[`**${r}**: ${e}`,""]:[]}function Xe(r){return r.assistantMessage?["","---","","**Previously**","",`A: ${r.assistantMessage}`,""]:[]}function Be(r,e){return["",`Access ${Math.round(r/1e3)}k tokens of past research & decisions for just ${e.toLocaleString()}t. Use MCP search tools to access memories by ID.`]}function Pe(r){return`# [${r}] recent context, ${Ce()}

No previous sessions found for this project yet.`}function Ge(){let r=new Date,e=r.toLocaleDateString("en-CA"),t=r.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",hour12:!0}).toLowerCase().replace(" ",""),s=r.toLocaleTimeString("en-US",{timeZoneName:"short"}).split(" ").pop();return`${e} ${t} ${s}`}function je(r){return["",`${c.bright}${c.cyan}[${r}] recent context, ${Ge()}${c.reset}`,`${c.gray}${"\u2500".repeat(60)}${c.reset}`,""]}function He(){let e=S.getInstance().getActiveMode().observation_types.map(t=>`${t.emoji} ${t.id}`).join(" | ");return[`${c.dim}Legend: session-request | ${e}${c.reset}`,""]}function We(){return[`${c.bright}Column Key${c.reset}`,`${c.dim}  Read: Tokens to read this observation (cost to learn it now)${c.reset}`,`${c.dim}  Work: Tokens spent on work that produced this record ( research, building, deciding)${c.reset}`,""]}function Ye(){return[`${c.dim}Context Index: This semantic index (titles, types, files, tokens) is usually sufficient to understand past work.${c.reset}`,"",`${c.dim}When you need implementation details, rationale, or debugging context:${c.reset}`,`${c.dim}  - Use MCP tools (search, get_observations) to fetch full observations on-demand${c.reset}`,`${c.dim}  - Critical types ( bugfix, decision) often need detailed fetching${c.reset}`,`${c.dim}  - Trust this index over re-reading code for past decisions and learnings${c.reset}`,""]}function Ve(r,e){let t=[];if(t.push(`${c.bright}${c.cyan}Context Economics${c.reset}`),t.push(`${c.dim}  Loading: ${r.totalObservations} observations (${r.totalReadTokens.toLocaleString()} tokens to read)${c.reset}`),t.push(`${c.dim}  Work investment: ${r.totalDiscoveryTokens.toLocaleString()} tokens spent on research, building, and decisions${c.reset}`),r.totalDiscoveryTokens>0&&(e.showSavingsAmount||e.showSavingsPercent)){let s="  Your savings: ";e.showSavingsAmount&&e.showSavingsPercent?s+=`${r.savings.toLocaleString()} tokens (${r.savingsPercent}% reduction from reuse)`:e.showSavingsAmount?s+=`${r.savings.toLocaleString()} tokens`:s+=`${r.savingsPercent}% reduction from reuse`,t.push(`${c.green}${s}${c.reset}`)}return t.push(""),t}function qe(r){return[`${c.bright}${c.cyan}${r}${c.reset}`,""]}function Ke(r){return[`${c.dim}${r}${c.reset}`]}function Je(r,e,t,s){let n=r.title||"Untitled",o=S.getInstance().getTypeIcon(r.type),{readTokens:i,discoveryTokens:a,workEmoji:d}=D(r,s),p=t?`${c.dim}${e}${c.reset}`:" ".repeat(e.length),u=s.showReadTokens&&i>0?`${c.dim}(~${i}t)${c.reset}`:"",m=s.showWorkTokens&&a>0?`${c.dim}(${d} ${a.toLocaleString()}t)${c.reset}`:"";return`  ${c.dim}#${r.id}${c.reset}  ${p}  ${o}  ${n} ${u} ${m}`}function ze(r,e,t,s,n){let o=[],i=r.title||"Untitled",a=S.getInstance().getTypeIcon(r.type),{readTokens:d,discoveryTokens:p,workEmoji:u}=D(r,n),m=t?`${c.dim}${e}${c.reset}`:" ".repeat(e.length),T=n.showReadTokens&&d>0?`${c.dim}(~${d}t)${c.reset}`:"",E=n.showWorkTokens&&p>0?`${c.dim}(${u} ${p.toLocaleString()}t)${c.reset}`:"";return o.push(`  ${c.dim}#${r.id}${c.reset}  ${m}  ${a}  ${c.bright}${i}${c.reset}`),s&&o.push(`    ${c.dim}${s}${c.reset}`),(T||E)&&o.push(`    ${T} ${E}`),o.push(""),o}function Qe(r,e){let t=`${r.request||"Session started"} (${e})`;return[`${c.yellow}#S${r.id}${c.reset} ${t}`,""]}function F(r,e,t){return e?[`${t}${r}:${c.reset} ${e}`,""]:[]}function Ze(r){return r.assistantMessage?["","---","",`${c.bright}${c.magenta}Previously${c.reset}`,"",`${c.dim}A: ${r.assistantMessage}${c.reset}`,""]:[]}function et(r,e){let t=Math.round(r/1e3);return["",`${c.dim}Access ${t}k tokens of past research & decisions for just ${e.toLocaleString()}t. Use MCP search tools to access memories by ID.${c.reset}`]}function tt(r){return`
${c.bright}${c.cyan}[${r}] recent context, ${Ge()}${c.reset}
${c.gray}${"\u2500".repeat(60)}${c.reset}

${c.dim}No previous sessions found for this project yet.${c.reset}
`}function st(r,e,t,s){let n=[];return s?n.push(...je(r)):n.push(...ye(r)),s?n.push(...He()):n.push(...ve()),s?n.push(...We()):n.push(...De()),s?n.push(...Ye()):n.push(...Me()),P(t)&&(s?n.push(...Ve(e,t)):n.push(...Ue(e,t))),n}var se=C(require("path"),1);function W(r){if(!r)return[];try{let e=JSON.parse(r);return Array.isArray(e)?e:[]}catch(e){return l.debug("PARSER","Failed to parse JSON array, using empty fallback",{preview:r?.substring(0,50)},e),[]}}function nt(r){return new Date(r).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit",hour12:!0})}function ot(r){return new Date(r).toLocaleString("en-US",{hour:"numeric",minute:"2-digit",hour12:!0})}function it(r){return new Date(r).toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric"})}function rt(r,e){return se.default.isAbsolute(r)?se.default.relative(e,r):r}function at(r,e,t){let s=W(r);if(s.length>0)return rt(s[0],e);if(t){let n=W(t);if(n.length>0)return rt(n[0],e)}return"General"}function Mt(r){let e=new Map;for(let s of r){let n=s.type==="observation"?s.data.created_at:s.data.displayTime,o=it(n);e.has(o)||e.set(o,[]),e.get(o).push(s)}let t=Array.from(e.entries()).sort((s,n)=>{let o=new Date(s[0]).getTime(),i=new Date(n[0]).getTime();return o-i});return new Map(t)}function Ut(r,e){return e.fullObservationField==="narrative"?r.narrative:r.facts?W(r.facts).join(`
`):null}function kt(r,e,t,s,n,o){let i=[];o?i.push(...qe(r)):i.push(...ke(r));let a=null,d="",p=!1;for(let u of e)if(u.type==="summary"){p&&(i.push(""),p=!1,a=null,d="");let m=u.data,T=nt(m.displayTime);o?i.push(...Qe(m,T)):i.push(...$e(m,T))}else{let m=u.data,T=at(m.files_modified,n,m.files_read),E=ot(m.created_at),g=E!==d,b=g?E:"";d=E;let _=t.has(m.id);if(T!==a&&(p&&i.push(""),o?i.push(...Ke(T)):i.push(...xe(T)),a=T,p=!0),_){let N=Ut(m,s);o?i.push(...ze(m,E,g,N,s)):(p&&!o&&(i.push(""),p=!1),i.push(...we(m,b,N,s)),a=null)}else o?i.push(Je(m,E,g,s)):i.push(Fe(m,b,s))}return p&&i.push(""),i}function dt(r,e,t,s,n){let o=[],i=Mt(r);for(let[a,d]of i)o.push(...kt(a,d,e,t,s,n));return o}function ct(r,e,t){return!(!r.showLastSummary||!e||!!!(e.investigated||e.learned||e.completed||e.next_steps)||t&&e.created_at_epoch<=t.created_at_epoch)}function pt(r,e){let t=[];return e?(t.push(...F("Investigated",r.investigated,c.blue)),t.push(...F("Learned",r.learned,c.yellow)),t.push(...F("Completed",r.completed,c.green)),t.push(...F("Next Steps",r.next_steps,c.magenta))):(t.push(...x("Investigated",r.investigated)),t.push(...x("Learned",r.learned)),t.push(...x("Completed",r.completed)),t.push(...x("Next Steps",r.next_steps))),t}function lt(r,e){return e?Ze(r):Xe(r)}function ut(r,e,t){return!P(e)||r.totalDiscoveryTokens<=0||r.savings<=0?[]:t?et(r.totalDiscoveryTokens,r.totalReadTokens):Be(r.totalDiscoveryTokens,r.totalReadTokens)}function xt(r,e){if(!r.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tags'").get())return null;let s="AND o.project = ?",n=r.prepare(`
    SELECT COUNT(DISTINCT it.item_id) as count
    FROM item_tags it
    JOIN tags t ON t.id = it.tag_id
    JOIN observations o ON o.id = it.item_id AND it.item_type = 'observation'
    WHERE t.name = 'bug' ${s}
  `).get(e),o=r.prepare(`
    SELECT COUNT(DISTINCT it.item_id) as count
    FROM item_tags it
    JOIN tags t ON t.id = it.tag_id
    JOIN observations o ON o.id = it.item_id AND it.item_type = 'observation'
    WHERE t.name = 'todo' ${s}
  `).get(e),i=r.prepare(`
    SELECT COUNT(*) as count FROM tasks WHERE status IN ('todo', 'in_progress') AND project = ?
  `).get(e),a=r.prepare(`
    SELECT COUNT(DISTINCT it.item_id) as count
    FROM item_tags it
    JOIN tags t ON t.id = it.tag_id
    JOIN observations o ON o.id = it.item_id AND it.item_type = 'observation'
    WHERE t.name IN ('learning', 'decision') ${s}
  `).get(e),d=r.prepare(`
    SELECT o.title, o.created_at_epoch
    FROM observations o
    JOIN item_tags it ON it.item_id = o.id AND it.item_type = 'observation'
    JOIN tags t ON t.id = it.tag_id
    WHERE t.name = 'decision' AND o.project = ?
    ORDER BY o.created_at_epoch DESC
    LIMIT 1
  `).get(e),p=null,u=null;if(d){p=d.title;let m=Date.now()-d.created_at_epoch,T=Math.floor(m/(1e3*60*60*24)),E=Math.floor(m/(1e3*60*60));T>0?u=`${T} day${T!==1?"s":""} ago`:E>0?u=`${E} hour${E!==1?"s":""} ago`:u="just now"}return{bugs:n.count,todos:o.count+i.count,learnings:a.count,lastDecision:p,lastDecisionAge:u}}function mt(r,e,t){let s=xt(r,e);if(!s)return[];if(s.bugs===0&&s.todos===0&&s.learnings===0&&!s.lastDecision)return[];let n=[];if(n.push(""),n.push("## Project Status"),s.bugs>0&&n.push(`- ${s.bugs} open bug${s.bugs!==1?"s":""}`),s.todos>0&&n.push(`- ${s.todos} active todo${s.todos!==1?"s":""}`),s.learnings>0&&n.push(`- ${s.learnings} learning${s.learnings!==1?"s":""} captured`),s.lastDecision&&s.lastDecisionAge){let o=s.lastDecision.length>60?s.lastDecision.substring(0,57)+"...":s.lastDecision;n.push(`- Last decision: "${o}" (${s.lastDecisionAge})`)}try{let o=r.prepare(`
      SELECT o.title FROM observations o
      JOIN item_tags it ON it.item_id = o.id AND it.item_type = 'observation'
      JOIN tags t ON t.id = it.tag_id
      WHERE t.name = 'bug' AND o.project = ? AND o.title IS NOT NULL
      ORDER BY o.created_at_epoch DESC LIMIT 3
    `).all(e);o.length>0&&n.push(`- Recent bugs: ${o.map(a=>a.title.length>50?a.title.substring(0,47)+"...":a.title).join(", ")}`);let i=r.prepare(`
      SELECT o.title FROM observations o
      JOIN item_tags it ON it.item_id = o.id AND it.item_type = 'observation'
      JOIN tags t ON t.id = it.tag_id
      WHERE t.name IN ('learning', 'decision') AND o.project = ? AND o.title IS NOT NULL
      ORDER BY o.created_at_epoch DESC LIMIT 3
    `).all(e);i.length>0&&n.push(`- Recent learnings: ${i.map(a=>a.title.length>50?a.title.substring(0,47)+"...":a.title).join(", ")}`)}catch{}try{let o=r.prepare(`
      SELECT started_at_epoch,
             (SELECT COUNT(*) FROM observations WHERE memory_session_id = s.session_id) as obs_count
      FROM sdk_sessions s
      WHERE s.project = ?
      ORDER BY s.started_at_epoch DESC
      LIMIT 1
    `).get(e);if(o){let i=Date.now()-o.started_at_epoch,a=Math.floor(i/6e4),d=a<60?`${a} min ago`:`${Math.floor(a/60)}h ago`;n.push(`- Last session: ${d}, ${o.obs_count} observations`)}}catch{}try{let o=r.prepare(`
      SELECT files_modified FROM observations
      WHERE project = ? AND files_modified IS NOT NULL AND files_modified != '[]'
      ORDER BY created_at_epoch DESC
      LIMIT 5
    `).all(e),i=new Set;for(let a of o){try{for(let d of JSON.parse(a.files_modified))if(i.add(d),i.size>=5)break}catch{}if(i.size>=5)break}i.size>0&&n.push(`- Recent files: ${[...i].join(", ")}`)}catch{}return n}function _t(r,e,t){if(!r.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='loop_configs'").get())return[];let n=r.prepare("SELECT * FROM loop_configs WHERE project = ? AND enabled = 1").get(e);if(!n)return[];let o=r.prepare("SELECT * FROM loop_iterations WHERE loop_config_id = ? ORDER BY iteration_number ASC").all(n.id),i=[],a=o.length,d=n.task_description||"Unnamed task";if(i.push(""),i.push(`## Active Loop: "${d}" (Iteration ${a+1}/${n.max_iterations}, Mode: ${n.mode})`),o.length>0){i.push("### Previous Iterations:");for(let p of o.slice(-5)){let u=p.key_findings||"No findings recorded",m=p.observations_count>0?` [${p.observations_count} obs]`:"";i.push(`- Iter ${p.iteration_number} (${p.mode_used||n.mode}): ${u}${m}`)}}if(n.success_criteria&&(i.push("### Success Criteria:"),i.push(n.success_criteria)),n.completion_promises)try{let p=JSON.parse(n.completion_promises);if(p.length>0){let u=n.promise_logic==="all"?"ALL":"ANY";i.push(`### Completion (${u}): Say ${p.map(m=>`<promise>${m}</promise>`).join(" ")} when done.`)}}catch{}return i}var A=require("fs"),M=C(require("path"),1),re=require("os");function Et(r,e){let t=M.default.join((0,re.homedir)(),".claude","teams"),s=M.default.join((0,re.homedir)(),".claude","tasks");if(!(0,A.existsSync)(t))return[];let n=[],o=!1;try{let i=(0,A.readdirSync)(t,{withFileTypes:!0}).filter(a=>a.isDirectory()).map(a=>a.name);for(let a of i){let d=M.default.join(t,a,"config.json");if((0,A.existsSync)(d))try{let u=JSON.parse((0,A.readFileSync)(d,"utf-8")).members||[],m=0,T=0,E=M.default.join(s,a);if((0,A.existsSync)(E))try{let g=(0,A.readdirSync)(E).filter(b=>b.endsWith(".json"));for(let b of g)try{let _=JSON.parse((0,A.readFileSync)(M.default.join(E,b),"utf-8"));m++,(_.status==="completed"||_.status==="done")&&T++}catch{}}catch{}o||(n.push(""),n.push("## Team Context"),o=!0),n.push(`- Team "${a}": ${u.length} member${u.length!==1?"s":""}, ${T}/${m} tasks complete`)}catch{}}}catch{}return n}var Ft=Tt.default.join((0,gt.homedir)(),".claude","plugins","marketplaces","EconLab-AI","plugin",".install-version");function wt(){try{return new X}catch(r){if(r.code==="ERR_DLOPEN_FAILED"){try{(0,Rt.unlinkSync)(Ft)}catch(e){l.debug("SYSTEM","Marker file cleanup failed (may not exist)",{},e)}return l.error("SYSTEM","Native module rebuild needed - restart Claude Code to auto-fix"),null}throw r}}function $t(r,e){return e?tt(r):Pe(r)}function Xt(r,e,t,s,n,o,i,a){let d=[],p=z(e);d.push(...st(r,p,s,i));let u=t.slice(0,s.sessionCount),m=Ae(u,t),T=te(e,m),E=Le(e,s.fullObservationCount);if(d.push(...dt(T,E,s,n,i)),a){try{d.push(...mt(a.db,r,i))}catch{}try{d.push(..._t(a.db,r,i))}catch{}}try{d.push(...Et(r,i))}catch{}let g=t[0],b=e[0];ct(s,g,b)&&d.push(...pt(g,i));let _=ee(e,s,o,n);return d.push(...lt(_,i)),d.push(...ut(p,s,i)),d.join(`
`).trimEnd()}async function ne(r,e=!1){let t=q(),s=r?.cwd??process.cwd(),n=Ne(s),o=r?.projects||[n],i=wt();if(!i)return"";try{let a=o.length>1?Ie(i,o,t):Q(i,n,t),d=o.length>1?Oe(i,o,t):Z(i,n,t);return a.length===0&&d.length===0?$t(n,e):Xt(n,a,d,t,s,r?.session_id,e,i)}finally{i.close()}}0&&(module.exports={generateContext});
