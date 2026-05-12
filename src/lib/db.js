import { supabase } from "@/lib/supabase";

/**
 * Tiny base44-shaped wrapper around the Supabase client. Lets every page keep
 * the `entity.list / filter / create / update / delete` shape we already use,
 * just talking to Supabase instead.
 *
 * Usage:
 *   const rows = await db("clients").filter({ tenant_id }, "-created_at");
 *   const newRow = await db("clients").create({ ... });
 */

const orderingFromString = (orderBy) => {
  if (!orderBy) return { column: "created_at", ascending: false };
  const desc = orderBy.startsWith("-");
  const column = desc ? orderBy.slice(1) : orderBy;
  // Translate base44's "created_date" to Postgres's "created_at"
  const colMap = { created_date: "created_at", updated_date: "updated_at" };
  return { column: colMap[column] ?? column, ascending: !desc };
};

const unwrap = ({ data, error }) => {
  if (error) throw error;
  return data;
};

const unwrapOne = ({ data, error }) => {
  if (error) throw error;
  return data;
};

export function db(table) {
  return {
    async list(orderBy, limit) {
      let q = supabase.from(table).select("*");
      const { column, ascending } = orderingFromString(orderBy);
      q = q.order(column, { ascending });
      if (limit) q = q.limit(limit);
      return unwrap(await q);
    },
    async filter(where, orderBy, limit) {
      let q = supabase.from(table).select("*");
      for (const [key, value] of Object.entries(where ?? {})) {
        if (value === null || value === undefined) {
          q = q.is(key, null);
        } else {
          q = q.eq(key, value);
        }
      }
      const { column, ascending } = orderingFromString(orderBy);
      q = q.order(column, { ascending });
      if (limit) q = q.limit(limit);
      return unwrap(await q);
    },
    async get(id) {
      return unwrapOne(await supabase.from(table).select("*").eq("id", id).maybeSingle());
    },
    async create(values) {
      return unwrapOne(await supabase.from(table).insert(values).select().single());
    },
    async update(id, values) {
      return unwrapOne(await supabase.from(table).update(values).eq("id", id).select().single());
    },
    async delete(id) {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
      return { id };
    },
  };
}

/**
 * Pre-bound handles matching the entity names used throughout the codebase.
 * The values are Postgres table names (snake_case, plural).
 */
export const entities = {
  Tenant: db("tenants"),
  Profile: db("profiles"),
  User: db("profiles"), // legacy alias
  Client: db("clients"),
  Area: db("areas"),
  CleaningEvent: db("cleaning_events"),
  Feedback: db("feedback"),
  InventoryItem: db("inventory_items"),
  InventoryCount: db("inventory_counts"),
  InventoryUsage: db("inventory_usage"),
  Project: db("projects"),
  Task: db("tasks"),
  AuditLog: db("audit_logs"),
  UsageMetric: db("usage_metrics"),
  Subscription: db("subscriptions"),
  SubscriptionPlan: db("subscription_plans"),
};
