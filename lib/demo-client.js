import { demoUser, seedDemo } from "./demo-data.js";
import { getDemoIdentity, setDemoIdentity } from "./demo-session.js";

const storageKey = "orion-auditing-data-v1";
let memory;

function readStore() {
  try {
    const value = typeof window === "undefined" ? null : window.localStorage.getItem(storageKey);
    if (value) {
      const store = JSON.parse(value);
      if (getDemoIdentity() !== undefined) {
        const previousSample = store.audit_report_shares?.find(row =>
          row.id === "demo-report-share" && row.status === "pending" &&
          row.shared_by === "demo-manager" && row.shared_with === "demo-auditor"
        );
        if (previousSample) {
          previousSample.shared_by = "demo-auditor";
          previousSample.shared_with = "demo-manager";
        }
      }
      return store;
    }
  } catch {
    // Keep the current session usable if browser storage is unavailable.
  }
  return memory ??= seedDemo();
}

function writeStore(store) {
  if (typeof window !== "undefined") window.localStorage.setItem(storageKey, JSON.stringify(store));
  memory = store;
}

export function demoId() {
  return globalThis.crypto?.randomUUID?.() ?? `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function relation(store, row, table, constraint) {
  const key = { audits: "audit_id", audit_analysis: "analysis_id", profiles: "user_id" }[table];
  if (constraint === "audit_analysis_created_by_fkey") {
    return store.profiles.find(profile => profile.id === row.created_by);
  }
  return (store[table] || []).find(item => item.id === row[key]);
}

function selectFields(store, row, fields) {
  if (!row) return null;
  const result = {};
  let depth = 0;
  let start = 0;
  for (let end = 0; end <= fields.length; end++) {
    if (fields[end] === "(") depth++;
    if (fields[end] === ")") depth--;
    if (end !== fields.length && (fields[end] !== "," || depth !== 0)) continue;
    const field = fields.slice(start, end).trim();
    start = end + 1;
    if (field === "*") {
      Object.assign(result, row);
    } else if (field.includes("(")) {
      const [name, nested] = field.split(/\((.*)/s);
      const [alias, table = alias] = name.trim().split(":");
      const [target, constraint] = table.trim().split("!");
      result[alias.split("!")[0]] = selectFields(store, relation(store, row, target, constraint), nested.slice(0, -1));
    } else if (field) {
      result[field] = row[field];
    }
  }
  return result;
}

const same = (left, right) => left === right || (left != null && right != null && String(left) === String(right));

class DemoQuery {
  constructor(table) {
    this.table = table;
    this.filters = [];
    this.orders = [];
  }

  select(fields = "*", options = {}) { this.fields = fields; this.options = options; return this; }
  eq(key, value) { this.filters.push(row => same(row[key], value)); return this; }
  neq(key, value) { this.filters.push(row => !same(row[key], value)); return this; }
  in(key, values) { this.filters.push(row => values.some(value => same(row[key], value))); return this; }
  gt(key, value) { this.filters.push(row => row[key] > value); return this; }
  order(key, { ascending = true } = {}) { this.orders.push([key, ascending]); return this; }
  limit(count) { this.end = (this.start ?? 0) + count; return this; }
  range(start, end) { this.start = start; this.end = end + 1; return this; }
  single() { this.cardinality = "one"; return this; }
  maybeSingle() { this.cardinality = "optional"; return this; }
  insert(values) { this.operation = "insert"; this.values = values; return this; }
  upsert(values, { onConflict } = {}) {
    this.operation = "upsert";
    this.values = values;
    this.conflict = (onConflict || (this.table === "audit_analysis" ? "audit_id,analysis_type" : "id")).split(",");
    return this;
  }
  update(values) { this.operation = "update"; this.values = values; return this; }
  delete() { this.operation = "delete"; return this; }

  run() {
    const store = readStore();
    const table = store[this.table] ??= [];
    const matches = row => this.filters.every(filter => filter(row));
    let rows;
    switch (this.operation) {
      case "insert":
      case "upsert":
        rows = [this.values].flat().map(values => {
          const existing = this.conflict && table.find(row =>
            this.conflict.every(key => values[key] != null && same(row[key], values[key]))
          );
          if (existing) return Object.assign(existing, values);
          const now = new Date().toISOString();
          const defaults = {
            audit_tasks: { status: "pending", evidence: [] },
            audit_analysis: { created_by: demoUser.id, updated_at: now },
            audit_report_shares: { status: "pending", shared_at: now },
            analysis_shares: { is_active: true, shared_at: now },
            messages: { is_read: false },
          }[this.table];
          const row = { id: demoId(), created_at: now, ...defaults, ...values };
          if (this.table === "analysis_shares" && !row.expires_at) {
            row.expires_at = "9999-12-31T00:00:00Z";
          }
          table.push(row);
          return row;
        });
        break;
      case "update":
        rows = table.filter(matches).map(row => Object.assign(row, this.values));
        break;
      case "delete":
        rows = table.filter(matches);
        store[this.table] = table.filter(row => !matches(row));
        break;
      default:
        rows = table.filter(matches);
    }
    if (this.operation) {
      writeStore(store);
      if (!this.fields) return { data: null, error: null };
    }
    const count = this.options?.count ? rows.length : null;
    rows.sort((a, b) => {
      for (const [key, ascending] of this.orders) {
        if (same(a[key], b[key])) continue;
        if (a[key] == null) return ascending ? 1 : -1;
        if (b[key] == null) return ascending ? -1 : 1;
        return (a[key] > b[key] ? 1 : -1) * (ascending ? 1 : -1);
      }
      return 0;
    });
    const data = rows.slice(this.start, this.end).map(row => selectFields(store, row, this.fields ?? "*"));
    if (this.cardinality && (data.length > 1 || (data.length === 0 && this.cardinality === "one"))) {
      return { data: null, count, error: { code: "PGRST116", message: "Expected one local record" } };
    }
    return { data: this.options?.head ? null : this.cardinality ? data[0] ?? null : data, count, error: null };
  }

  then(resolve, reject) {
    return Promise.resolve().then(() => this.run()).then(resolve, reject);
  }
}

const user = async () => {
  const identity = getDemoIdentity();
  if (identity === null) return null;
  const auditee = typeof window !== "undefined" && window.location.pathname.startsWith("/auditee/");
  const id = identity?.id ?? (auditee ? "demo-auditee" : demoUser.id);
  const profile = readStore().profiles.find(row => row.id === id);
  return { ...demoUser, id, email: profile?.email ?? demoUser.email, user_metadata: { full_name: profile?.full_name ?? demoUser.user_metadata.full_name } };
};

function fileAsDataUrl(file) {
  if (typeof file === "string") return Promise.resolve(file);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export const demoClient = {
  from: table => new DemoQuery(table),
  auth: {
    getUser: async () => ({ data: { user: await user() }, error: null }),
    getSession: async () => {
      const current = await user();
      return { data: { session: current ? { user: current } : null }, error: null };
    },
    updateUser: async values => {
      if (values.email) await demoClient.from("profiles").update({ email: values.email }).eq("id", (await user()).id);
      return { data: { user: await user() }, error: null };
    },
    signUp: async ({ email, options }) => ({ data: { user: { id: demoId(), email, user_metadata: options?.data } }, error: null }),
    signOut: async () => {
      if (getDemoIdentity() !== undefined) setDemoIdentity(null);
      return { error: null };
    },
  },
  storage: {
    from: bucket => ({
      async upload(path, file) {
        try {
          const url = await fileAsDataUrl(file);
          await demoClient.from("demo_files").upsert({ id: `${bucket}/${path}`, url });
          return { data: { path }, error: null };
        } catch (error) {
          return { data: null, error };
        }
      },
      getPublicUrl(path) {
        return { data: { publicUrl: readStore().demo_files?.find(row => row.id === `${bucket}/${path}`)?.url ?? "" } };
      },
    }),
  },
};
