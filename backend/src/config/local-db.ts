import fs from "fs";
import path from "path";

const DB_PATH = path.resolve(__dirname, "../../data/db.json");

// Ensure data directory exists
if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

// Initial state
const DEFAULT_DB: any = {
  potholes: [],
  wards: [],
  localities: [],
  weekly_reports: [],
  config: [{ id: "weather", rainfallMm: 0, forecast: "clear", monsoonRiskZones: [] }]
};

class LocalCollection {
  private items: any[];
  constructor(private name: string, data: any[]) {
    this.items = Array.isArray(data) ? data : [];
  }

  async get() {
    return {
      docs: this.items.map(d => ({
        id: d.id,
        data: () => d,
        exists: true,
        ref: this.doc(d.id)
      })),
      size: this.items.length,
      forEach: (cb: any) => this.items.forEach(d => cb({ id: d.id, data: () => d, ref: this.doc(d.id) })),
    };
  }

  doc(id: string) {
    const item = this.items.find(d => d.id === id);
    return {
      get: async () => ({
        exists: !!item,
        data: () => item,
        id
      }),
      set: async (data: any) => {
        const index = this.items.findIndex(d => d.id === id);
        if (index > -1) {
          this.items[index] = { ...this.items[index], ...data, id };
        } else {
          this.items.push({ ...data, id });
        }
        saveDb(this.name, this.items);
      },
      update: async (data: any) => {
        const index = this.items.findIndex(d => d.id === id);
        if (index > -1) {
          this.items[index] = { ...this.items[index], ...data };
          saveDb(this.name, this.items);
        }
      },
      delete: async () => {
        const index = this.items.findIndex(d => d.id === id);
        if (index > -1) {
          this.items.splice(index, 1);
          saveDb(this.name, this.items);
        }
      }
    };
  }

  where(field: string, op: string, value: any) {
    let filtered = this.items;
    if (op === "==") filtered = this.items.filter(d => d[field] === value);
    if (op === ">=") filtered = this.items.filter(d => d[field] >= value);
    if (op === "<=") filtered = this.items.filter(d => d[field] <= value);
    return new LocalCollection(this.name, filtered);
  }

  orderBy(field: string, dir: "asc" | "desc" = "asc") {
    const sorted = [...this.items].sort((a, b) => {
      if (a[field] < b[field]) return dir === "asc" ? -1 : 1;
      if (a[field] > b[field]) return dir === "asc" ? 1 : -1;
      return 0;
    });
    return new LocalCollection(this.name, sorted);
  }

  limit(n: number) {
    return new LocalCollection(this.name, this.items.slice(0, n));
  }

  offset(n: number) {
    return new LocalCollection(this.name, this.items.slice(n));
  }

  count() {
    return { get: async () => ({ data: () => ({ count: this.items.length }) }) };
  }
}

function loadDb() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2));
    return JSON.parse(JSON.stringify(DEFAULT_DB));
  }
  try {
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    return DEFAULT_DB;
  }
}

function saveDb(collectionName: string, data: any[]) {
  const db = loadDb();
  db[collectionName] = data;
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

export const localDb = {
  collection: (name: string) => {
    const db = loadDb();
    if (!db[name]) db[name] = [];
    return new LocalCollection(name, db[name]);
  },
  batch: () => ({
    set: (ref: any, data: any) => ref.set(data),
    update: (ref: any, data: any) => ref.update(data),
    delete: (ref: any) => ref.delete(),
    commit: async () => { /* Done immediately in this simple mock */ }
  }),
  settings: () => {}
};
