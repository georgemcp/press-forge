import { vi } from "vitest";

export type FakeRow = Record<string, unknown>;

type Filter = { column: string; values: unknown[] };

/** Minimal in-memory stand-in for the export_orders PostgREST builder (select/update/upsert/delete + eq/in/limit). */
export function createFakeOrders(initial: FakeRow[] = []) {
  const rows: FakeRow[] = initial.map((row, index) => ({ id: `order_${index}`, ...row }));
  let nextId = rows.length;
  const writes: Array<{ op: string; payload?: FakeRow }> = [];
  type Interleave = { when: (info: { op: string; affected: number }) => boolean; run: () => unknown };
  const interleaves: Interleave[] = [];

  /** Runs `run` once, right after the first export_orders query matching `when` completes and before its caller resumes. */
  function interleaveAfter(when: Interleave["when"], run: Interleave["run"]) {
    interleaves.push({ when, run });
  }

  async function settle<T extends { data: unknown }>(op: string, result: T): Promise<T> {
    const affected = Array.isArray(result.data) ? result.data.length : 0;
    const index = interleaves.findIndex((i) => i.when({ op, affected }));
    if (index >= 0) {
      const [hit] = interleaves.splice(index, 1);
      await hit.run();
    }
    return result;
  }

  function query() {
    let op: "select" | "update" | "upsert" | "delete" = "select";
    let payload: FakeRow = {};
    let ignoreDuplicates = false;
    let onConflict = "";
    let returning = false;
    let single = false;
    const filters: Filter[] = [];

    const matches = (row: FakeRow) => filters.every((f) => f.values.includes(row[f.column]));

    function run() {
      if (op === "select") {
        const data = rows.filter(matches).map((r) => ({ ...r }));
        return { data: single ? (data[0] ?? null) : data, error: null };
      }
      if (op === "update") {
        const hit = rows.filter(matches);
        hit.forEach((r) => Object.assign(r, payload));
        return { data: returning ? hit.map((r) => ({ ...r })) : null, error: null };
      }
      if (op === "delete") {
        for (const r of rows.filter(matches)) rows.splice(rows.indexOf(r), 1);
        return { data: null, error: null };
      }
      const conflict = rows.find((r) => r[onConflict] === payload[onConflict]);
      if (conflict && ignoreDuplicates) return { data: [], error: null };
      if (conflict) Object.assign(conflict, payload);
      else rows.push({ id: `order_${nextId++}`, ...payload });
      return { data: returning ? [{ ...(conflict ?? rows[rows.length - 1]) }] : null, error: null };
    }

    const builder = {
      select: vi.fn(() => {
        if (op !== "select") returning = true;
        return builder;
      }),
      update: vi.fn((values: FakeRow) => {
        op = "update";
        payload = values;
        writes.push({ op, payload: values });
        return builder;
      }),
      upsert: vi.fn((values: FakeRow, options?: { onConflict?: string; ignoreDuplicates?: boolean }) => {
        op = "upsert";
        payload = values;
        onConflict = options?.onConflict ?? "id";
        ignoreDuplicates = Boolean(options?.ignoreDuplicates);
        writes.push({ op, payload: values });
        return builder;
      }),
      delete: vi.fn(() => {
        op = "delete";
        writes.push({ op });
        return builder;
      }),
      eq: vi.fn((column: string, value: unknown) => {
        filters.push({ column, values: [value] });
        return builder;
      }),
      in: vi.fn((column: string, values: unknown[]) => {
        filters.push({ column, values });
        return builder;
      }),
      limit: vi.fn(() => builder),
      maybeSingle: vi.fn(() => {
        single = true;
        return settle(op, run());
      }),
      then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => settle(op, run()).then(resolve, reject)
    };
    return builder;
  }

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === "export_orders") return query();
      if (table === "credits_usage") return { insert: creditInsert };
      if (table === "users") return { update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })) };
      if (table === "admin_audit_events") return { insert: vi.fn(async () => ({ error: null })) };
      throw new Error(`Unexpected table ${table}`);
    })
  };
  const creditInsert = vi.fn(async () => ({ error: null }));

  return { supabase, rows, writes, creditInsert, interleaveAfter };
}
