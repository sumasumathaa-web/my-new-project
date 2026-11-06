/**
 * PostgREST-compatible query engine for the embedded (local) database.
 *
 * It implements the subset of the supabase-js/PostgREST query builder that the
 * application uses — filters, ordering, pagination, exact counts, `single` /
 * `maybeSingle`, embedded relations (`category:categories(*)`, `orders!inner(status)`)
 * and mutations with `returning`. Application code therefore stays identical
 * whether it runs against Supabase or the local Postgres.
 */
import type { DbError, DbQuery, DbResult, OrderOptions, SelectOptions } from "@/lib/db/core";
import { getLocalState, type LocalState } from "@/lib/local/registry";
type Action = "select" | "insert" | "update" | "delete" | "upsert";
type Op = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "is" | "ilike" | "like" | "or";

interface Filter {
  op: Op;
  column: string;
  value: unknown;
}

interface Embed {
  alias: string;
  table: string;
  inner: boolean;
  select: ParsedSelect;
}

interface ParsedSelect {
  columns: string[];
  embeds: Embed[];
}

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;
const TABLE = /^[A-Za-z_][A-Za-z0-9_]*$/;

function quoteIdent(name: string): string {
  if (!IDENT.test(name)) throw new Error(`Invalid identifier: ${name}`);
  return `"${name}"`;
}

function splitTopLevel(input: string, sep = ","): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of input) {
    if (char === "(" || char === "{") depth += 1;
    if (char === ")" || char === "}") depth -= 1;
    if (char === sep && depth === 0) {
      out.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  if (current.trim()) out.push(current);
  return out;
}

export function parseSelect(input: string): ParsedSelect {
  const parsed: ParsedSelect = { columns: [], embeds: [] };
  for (const rawToken of splitTopLevel(input)) {
    const token = rawToken.trim();
    if (!token) continue;
    const open = token.indexOf("(");
    if (open === -1) {
      parsed.columns.push(token === "*" ? "*" : token.trim());
      continue;
    }
    const head = token.slice(0, open).trim();
    const inner = token.slice(open + 1, token.lastIndexOf(")"));
    let alias = "";
    let relation = head;
    const colon = head.indexOf(":");
    if (colon !== -1) {
      alias = head.slice(0, colon).trim();
      relation = head.slice(colon + 1).trim();
    }
    let innerJoin = false;
    if (relation.includes("!")) {
      const parts = relation.split("!");
      relation = parts[0].trim();
      innerJoin = parts.slice(1).some((p) => p.trim() === "inner");
    }
    parsed.embeds.push({
      alias: alias || relation,
      table: relation,
      inner: innerJoin,
      select: parseSelect(inner),
    });
  }
  return parsed;
}

function toDbError(error: unknown): DbError {
  const e = error as { message?: string; code?: string; detail?: string; hint?: string };
  return { message: e.message ?? "Database error", code: e.code, details: e.detail ?? null, hint: e.hint ?? null };
}

function project(row: Record<string, unknown> | null, columns: string[]): Record<string, unknown> | null {
  if (!row) return null;
  if (columns.length === 0 || columns.includes("*")) return row;
  const out: Record<string, unknown> = {};
  for (const col of columns) {
    const key = col.trim();
    if (!key || key.includes(":")) continue;
    out[key] = row[key];
  }
  return out;
}

/** Comparison used for embedded filters and for string timestamps. */
function matches(value: unknown, op: string, expected: unknown): boolean {
  switch (op) {
    case "eq":
      return String(value) === String(expected);
    case "neq":
      return String(value) !== String(expected);
    case "in":
      return Array.isArray(expected) && expected.map(String).includes(String(value));
    default:
      return true;
  }
}

export class LocalQuery<T = any> implements DbQuery<T> {
  private action: Action = "select";
  private selectInput = "*";
  private selectOptions: SelectOptions = {};
  private filters: Filter[] = [];
  private orders: { column: string; ascending: boolean; nullsFirst?: boolean }[] = [];
  private take: number | null = null;
  private offset = 0;
  private singleMode: "none" | "single" | "maybe" = "none";
  private payload: Record<string, unknown> | Record<string, unknown>[] | null = null;
  private upsertOptions: { onConflict?: string; ignoreDuplicates?: boolean } | undefined;
  private execution: Promise<DbResult<unknown>> | null = null;

  constructor(private readonly table: string) {
    if (!TABLE.test(table)) throw new Error(`Invalid table: ${table}`);
  }

  /* ------------------------------- builder -------------------------------- */

  select(columns?: string, options?: SelectOptions): this {
    if (columns) this.selectInput = columns;
    if (options) this.selectOptions = options;
    return this;
  }
  insert(values: Record<string, unknown> | Record<string, unknown>[]): this {
    this.action = "insert";
    this.payload = values;
    return this;
  }
  upsert(
    values: Record<string, unknown> | Record<string, unknown>[],
    options?: { onConflict?: string; ignoreDuplicates?: boolean },
  ): this {
    this.action = "upsert";
    this.payload = values;
    this.upsertOptions = options;
    return this;
  }
  update(values: Record<string, unknown>): this {
    this.action = "update";
    this.payload = values;
    return this;
  }
  delete(): this {
    this.action = "delete";
    return this;
  }
  private push(op: Op, column: string, value: unknown): this {
    this.filters.push({ op, column, value });
    return this;
  }
  eq(column: string, value: unknown): this {
    return this.push("eq", column, value);
  }
  neq(column: string, value: unknown): this {
    return this.push("neq", column, value);
  }
  gt(column: string, value: unknown): this {
    return this.push("gt", column, value);
  }
  gte(column: string, value: unknown): this {
    return this.push("gte", column, value);
  }
  lt(column: string, value: unknown): this {
    return this.push("lt", column, value);
  }
  lte(column: string, value: unknown): this {
    return this.push("lte", column, value);
  }
  in(column: string, values: readonly unknown[]): this {
    return this.push("in", column, values);
  }
  is(column: string, value: boolean | null): this {
    return this.push("is", column, value);
  }
  ilike(column: string, pattern: string): this {
    return this.push("ilike", column, pattern);
  }
  like(column: string, pattern: string): this {
    return this.push("like", column, pattern);
  }
  or(filters: string): this {
    return this.push("or", "", filters);
  }
  order(column: string, options?: OrderOptions): this {
    this.orders.push({ column, ascending: options?.ascending ?? true, nullsFirst: options?.nullsFirst });
    return this;
  }
  limit(count: number): this {
    this.take = count;
    return this;
  }
  range(from: number, to: number): this {
    this.offset = from;
    this.take = to - from + 1;
    return this;
  }
  single(): this {
    this.singleMode = "single";
    return this;
  }
  maybeSingle(): this {
    this.singleMode = "maybe";
    return this;
  }

  then<A = DbResult<T>, B = never>(
    onFulfilled?: ((value: DbResult<T>) => A | PromiseLike<A>) | null,
    onRejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return this.run().then(onFulfilled as never, onRejected as never) as PromiseLike<A | B>;
  }

  /* ------------------------------ execution ------------------------------- */

  private run(): Promise<DbResult<T>> {
    if (!this.execution) this.execution = this.execute();
    return this.execution as Promise<DbResult<T>>;
  }

  private async execute(): Promise<DbResult<T>> {
    try {
      const state = await getLocalState();
      const embeddedFilters = this.filters.filter((f) => f.op === "or" ? false : f.column.includes("."));
      const tableFilters = this.filters.filter((f) => !embeddedFilters.includes(f));

      const { sql: whereSql, params } = this.buildWhere(state, tableFilters);

      switch (this.action) {
        case "insert":
        case "upsert":
          return (await this.executeWrite(state, whereSql, params)) as DbResult<T>;
        case "update":
          return (await this.executeUpdate(state, whereSql, params)) as DbResult<T>;
        case "delete":
          return (await this.executeDelete(state, whereSql, params)) as DbResult<T>;
        default:
          return (await this.executeSelect(state, whereSql, params, embeddedFilters)) as DbResult<T>;
      }
    } catch (error) {
      if (process.env.LOCAL_DB_DEBUG === "1") {
        console.error("[local-db] query failed", this.table, this.action, error);
      }
      return { data: null, error: toDbError(error) };
    }
  }

  private buildWhere(state: LocalState, filters: Filter[]): { sql: string; params: unknown[] } {
    const clauses: string[] = [];
    const params: unknown[] = [];
    for (const filter of filters) {
      const add = (value: unknown): string => {
        params.push(value);
        return `$${params.length}`;
      };
      if (filter.op === "or") {
        const terms = splitTopLevel(String(filter.value));
        const ors: string[] = [];
        for (const term of terms) {
          const dot = term.indexOf(".");
          if (dot === -1) continue;
          const column = term.slice(0, dot);
          const rest = term.slice(dot + 1);
          const secondDot = rest.indexOf(".");
          if (secondDot === -1) continue;
          const op = rest.slice(0, secondDot);
          const raw = rest.slice(secondDot + 1);
          const cast = this.columnCast(state, this.table, column);
          switch (op) {
            case "ilike":
              ors.push(`${quoteIdent(column)} ilike ${add(raw)}`);
              break;
            case "like":
              ors.push(`${quoteIdent(column)} like ${add(raw)}`);
              break;
            case "eq":
              ors.push(`${quoteIdent(column)} = ${add(raw)}${cast}`);
              break;
            case "neq":
              ors.push(`${quoteIdent(column)} <> ${add(raw)}${cast}`);
              break;
            case "is":
              ors.push(`${quoteIdent(column)} is ${raw === "null" ? "null" : raw}`);
              break;
            case "cs": {
              const items = raw.replace(/^\{|\}$/g, "").split(",").filter(Boolean);
              ors.push(`${quoteIdent(column)} @> array[${items.map((i) => `${add(i)}::text`).join(",")}]`);
              break;
            }
            case "in": {
              const items = raw.replace(/^\(|\)$/g, "").split(",").filter(Boolean);
              ors.push(`${quoteIdent(column)} in (${items.map((i) => add(i)).join(",")})`);
              break;
            }
            default:
              break;
          }
        }
        if (ors.length) clauses.push(`(${ors.join(" or ")})`);
        continue;
      }

      const column = quoteIdent(filter.column);
      switch (filter.op) {
        case "eq":
          if (filter.value === null) clauses.push(`${column} is null`);
          else clauses.push(`${column} = ${add(filter.value)}`);
          break;
        case "neq":
          if (filter.value === null) clauses.push(`${column} is not null`);
          else clauses.push(`${column} <> ${add(filter.value)}`);
          break;
        case "gt":
          clauses.push(`${column} > ${add(filter.value)}`);
          break;
        case "gte":
          clauses.push(`${column} >= ${add(filter.value)}`);
          break;
        case "lt":
          clauses.push(`${column} < ${add(filter.value)}`);
          break;
        case "lte":
          clauses.push(`${column} <= ${add(filter.value)}`);
          break;
        case "in": {
          const values = filter.value as unknown[];
          if (values.length === 0) clauses.push("false");
          else clauses.push(`${column} in (${values.map((v) => add(v)).join(",")})`);
          break;
        }
        case "is":
          clauses.push(`${column} is ${filter.value === null ? "null" : filter.value ? "true" : "false"}`);
          break;
        case "ilike":
          clauses.push(`${column} ilike ${add(filter.value)}`);
          break;
        case "like":
          clauses.push(`${column} like ${add(filter.value)}`);
          break;
        default:
          break;
      }
    }
    return { sql: clauses.length ? `where ${clauses.join(" and ")}` : "", params };
  }

  /** Column type cast used when a filter value should be coerced (e.g. uuid). */
  private columnCast(state: LocalState, table: string, column: string): string {
    const type = state.columns.get(table)?.get(column)?.type;
    if (!type) return "";
    if (type === "uuid") return "::uuid";
    if (type === "integer" || type === "bigint" || type === "smallint") return "::int";
    if (type === "numeric") return "::numeric";
    if (type === "boolean") return "::boolean";
    return "";
  }

  private orderSql(): string {
    if (this.orders.length === 0) return "";
    const parts = this.orders
      .filter((o) => !o.column.includes("."))
      .map((o) => `${quoteIdent(o.column)} ${o.ascending ? "asc" : "desc"}${o.nullsFirst === undefined ? "" : o.nullsFirst ? " nulls first" : " nulls last"}`);
    return parts.length ? `order by ${parts.join(", ")}` : "";
  }

  private async executeSelect(
    state: LocalState,
    whereSql: string,
    params: unknown[],
    embeddedFilters: Filter[],
  ): Promise<DbResult<unknown>> {
    const parsed = parseSelect(this.selectInput);
    const countRequested = this.selectOptions.count === "exact";
    const columnList =
      parsed.embeds.length > 0
        ? parsed.columns.length && parsed.columns[0] !== "*"
          ? parsed.columns.map(quoteIdent).join(", ")
          : "*"
        : parsed.columns.length && parsed.columns[0] !== "*"
          ? parsed.columns.map(quoteIdent).join(", ")
          : "*";

    const baseSql = `select ${columnList} from public.${quoteIdent(this.table)} ${whereSql}`;
    let count: number | null = null;

    if (this.selectOptions.head) {
      const counted = await state.db.query<{ count: string }>(
        `select count(*)::text as count from public.${quoteIdent(this.table)} ${whereSql}`,
        params,
      );
      count = Number(counted.rows[0]?.count ?? 0);
      return { data: null, error: null, count };
    }

    let rows: Record<string, unknown>[];
    let usedChunking = false;

    if (embeddedFilters.length > 0) {
      // Apply embedded filters in JS so relation predicates are respected; then paginate.
      const all = await state.db.query<Record<string, unknown>>(baseSql, params);
      rows = all.rows;
      usedChunking = true;
    } else {
      const limitSql = this.take !== null ? ` limit ${this.take} offset ${this.offset}` : "";
      const ordered = await state.db.query<Record<string, unknown>>(`${baseSql} ${this.orderSql()}${limitSql}`, params);
      rows = ordered.rows;
    }

    if (countRequested && !usedChunking) {
      const counted = await state.db.query<{ count: string }>(
        `select count(*)::text as count from public.${quoteIdent(this.table)} ${whereSql}`,
        params,
      );
      count = Number(counted.rows[0]?.count ?? 0);
    }

    await this.attachEmbeds(state, this.table, rows, parsed);

    if (usedChunking) {
      for (const filter of embeddedFilters) {
        const [alias, column] = filter.column.split(".");
        const expected = filter.value;
        rows = rows.filter((row) => {
          const relation = row[alias];
          if (Array.isArray(relation)) return relation.some((r) => matches((r as Record<string, unknown>)[column], filter.op, expected));
          if (relation && typeof relation === "object") return matches((relation as Record<string, unknown>)[column], filter.op, expected);
          return false;
        });
      }
      // Keep relations that are not inner (inner filtering already applied in attachEmbeds).
      const orderedRows = this.applyOrderInJs(rows);
      if (countRequested) count = orderedRows.length;
      rows = this.take !== null ? orderedRows.slice(this.offset, this.offset + this.take) : orderedRows;
    }

    if (this.singleMode !== "none") {
      if (rows.length === 0) {
        if (this.singleMode === "maybe") return { data: null, error: null, count };
        return {
          data: null,
          error: { message: "JSON object requested, multiple (or no) rows returned", code: "PGRST116" },
          count,
        };
      }
      if (rows.length > 1) {
        return {
          data: null,
          error: { message: "JSON object requested, multiple (or no) rows returned", code: "PGRST116" },
          count,
        };
      }
      return { data: rows[0], error: null, count };
    }

    return { data: rows, error: null, count };
  }

  private applyOrderInJs(rows: Record<string, unknown>[]): Record<string, unknown>[] {
    if (this.orders.length === 0) return rows;
    const sorted = [...rows];
    sorted.sort((a, b) => {
      for (const order of this.orders) {
        const av = a[order.column];
        const bv = b[order.column];
        if (av === bv) continue;
        const direction = order.ascending ? 1 : -1;
        if (av === null || av === undefined) return order.nullsFirst ? -direction : direction;
        if (bv === null || bv === undefined) return order.nullsFirst ? direction : -direction;
        if (typeof av === "number" && typeof bv === "number") return (av - bv) * direction;
        return String(av).localeCompare(String(bv)) * direction;
      }
      return 0;
    });
    return sorted;
  }

  /** Resolves and attaches embedded relations (one-to-one / one-to-many). */
  private async attachEmbeds(
    state: LocalState,
    table: string,
    rows: Record<string, unknown>[],
    parsed: ParsedSelect,
    depth = 0,
  ): Promise<void> {
    if (depth > 3 || rows.length === 0) return;
    for (const embed of parsed.embeds) {
      const relation = this.resolveRelation(state, table, embed.table);
      if (!relation) {
        for (const row of rows) row[embed.alias] = relation === null ? null : null;
        continue;
      }
      const childColumns = embed.select.columns.length && embed.select.columns[0] !== "*"
        ? embed.select.columns.filter((c) => !c.includes(":")).map((c) => quoteIdent(c)).join(", ") || "*"
        : "*";

      if (relation.direction === "child-holder") {
        // parent holds FK → child is a single object
        const parentColumn = relation.parentColumn;
        const values = [...new Set(rows.map((r) => r[parentColumn]).filter((v) => v !== null && v !== undefined))];
        if (values.length === 0) {
          for (const row of rows) row[embed.alias] = null;
          continue;
        }
        const placeholders = values.map((_, i) => `$${i + 1}`).join(",");
        const result = await state.db.query<Record<string, unknown>>(
          `select ${childColumns} from public.${quoteIdent(embed.table)} where ${quoteIdent(relation.childColumn)} in (${placeholders})`,
          values,
        );
        await this.attachEmbeds(state, embed.table, result.rows, embed.select, depth + 1);
        const byId = new Map(result.rows.map((r) => [String(r[relation.childColumn]), r]));
        for (const row of rows) row[embed.alias] = byId.get(String(row[parentColumn])) ?? null;
        if (embed.inner) {
          for (let i = rows.length - 1; i >= 0; i -= 1) if (!rows[i][embed.alias]) rows.splice(i, 1);
        }
      } else {
        // child holds FK → array of children
        const parentIds = [...new Set(rows.map((r) => r[relation.parentColumn]).filter((v) => v !== null && v !== undefined))];
        if (parentIds.length === 0) {
          for (const row of rows) row[embed.alias] = [];
          continue;
        }
        const placeholders = parentIds.map((_, i) => `$${i + 1}`).join(",");
        const orderBy = this.childOrder(state, embed.table);
        const result = await state.db.query<Record<string, unknown>>(
          `select ${childColumns} from public.${quoteIdent(embed.table)} where ${quoteIdent(relation.childColumn)} in (${placeholders})${orderBy}`,
          parentIds,
        );
        await this.attachEmbeds(state, embed.table, result.rows, embed.select, depth + 1);
        const grouped = new Map<string, Record<string, unknown>[]>();
        for (const child of result.rows) {
          const key = String(child[relation.childColumn]);
          if (!grouped.has(key)) grouped.set(key, []);
          grouped.get(key)!.push(child);
        }
        for (const row of rows) row[embed.alias] = grouped.get(String(row[relation.parentColumn])) ?? [];
        if (embed.inner) {
          for (let i = rows.length - 1; i >= 0; i -= 1) {
            const value = rows[i][embed.alias] as unknown[] | undefined;
            if (!value || value.length === 0) rows.splice(i, 1);
          }
        }
      }
    }
  }

  private childOrder(state: LocalState, table: string): string {
    const tableColumns = state.columns.get(table) ?? new Map<string, { type: string }>();
    const explicit = this.orders
      .filter((o) => o.column.includes("."))
      .map((o) => {
        const [, rest] = o.column.split(".", 2);
        return tableColumns.has(rest) ? `${quoteIdent(rest)} ${o.ascending ? "asc" : "desc"}` : null;
      })
      .filter((clause): clause is string => Boolean(clause))
      .join(", ");
    if (explicit) return ` order by ${explicit}`;
    const parts: string[] = [];
    if (tableColumns.has("sort_order")) parts.push('"sort_order" asc');
    if (tableColumns.has("created_at")) parts.push('"created_at" asc');
    return parts.length ? ` order by ${parts.join(", ")}` : "";
  }

  private resolveRelation(
    state: LocalState,
    parentTable: string,
    childTable: string,
  ): { direction: "child-holder" | "parent-holder"; parentColumn: string; childColumn: string } | null {
    const fk = state.foreignKeys.find((f) => f.table === parentTable && f.foreignTable === childTable);
    if (fk) {
      // parent holds a FK to the child → single object
      const childPk = state.primaryKeys.get(childTable)?.[0] ?? "id";
      return { direction: "child-holder", parentColumn: fk.column, childColumn: childPk };
    }
    const reverse = state.foreignKeys.find((f) => f.table === childTable && f.foreignTable === parentTable);
    if (reverse) {
      const parentPk = state.primaryKeys.get(parentTable)?.[0] ?? "id";
      return { direction: "parent-holder", parentColumn: parentPk, childColumn: reverse.column };
    }
    return null;
  }

  /* -------------------------------- writes -------------------------------- */

  private serializeValue(state: LocalState, table: string, column: string, value: unknown): unknown {
    if (value === undefined) return null;
    const type = state.columns.get(table)?.get(column)?.type;
    if (value === null) return null;
    if (type === "jsonb" || type === "json") return JSON.stringify(value);
    if (type === "ARRAY" && Array.isArray(value)) return value;
    if (type === "boolean") return value;
    if (typeof value === "object" && type !== "ARRAY") return JSON.stringify(value);
    return value;
  }

  private async executeWrite(state: LocalState, whereSql: string, params: unknown[]): Promise<DbResult<unknown>> {
    const payloadRows = Array.isArray(this.payload) ? this.payload : this.payload ? [this.payload] : [];
    if (payloadRows.length === 0) return { data: null, error: { message: "No values provided" } };

    const columns = [...new Set(payloadRows.flatMap((row) => Object.keys(row)))];
    columns.forEach(quoteIdent);
    const valueRows: unknown[] = [];
    const rowsSql = payloadRows
      .map((row) => {
        const placeholders = columns.map((column) => {
          valueRows.push(this.serializeValue(state, this.table, column, row[column]));
          return `$${valueRows.length}`;
        });
        return `(${placeholders.join(",")})`;
      })
      .join(",");

    let conflictSql = "";
    if (this.action === "upsert") {
      const conflictColumns = (this.upsertOptions?.onConflict ?? state.primaryKeys.get(this.table)?.join(",") ?? "id")
        .split(",")
        .map((c) => c.trim());
      conflictColumns.forEach(quoteIdent);
      if (this.upsertOptions?.ignoreDuplicates) {
        conflictSql = ` on conflict (${conflictColumns.map(quoteIdent).join(",")}) do nothing`;
      } else {
        const updates = columns
          .filter((c) => !conflictColumns.includes(c))
          .map((c) => `${quoteIdent(c)} = excluded.${quoteIdent(c)}`);
        conflictSql = updates.length
          ? ` on conflict (${conflictColumns.map(quoteIdent).join(",")}) do update set ${updates.join(", ")}`
          : ` on conflict (${conflictColumns.map(quoteIdent).join(",")}) do nothing`;
      }
    }

    const sql = `insert into public.${quoteIdent(this.table)} (${columns.map(quoteIdent).join(",")}) values ${rowsSql}${conflictSql} returning *`;
    const result = await state.db.query<Record<string, unknown>>(sql, valueRows);
    void whereSql;
    void params;
    return this.finishWrite(result.rows);
  }

  private async executeUpdate(state: LocalState, whereSql: string, params: unknown[]): Promise<DbResult<unknown>> {
    const payload = (Array.isArray(this.payload) ? this.payload[0] : this.payload) ?? {};
    const columns = Object.keys(payload);
    if (columns.length === 0) return { data: null, error: { message: "No values provided" } };
    columns.forEach(quoteIdent);
    const values: unknown[] = [];
    const setSql = columns
      .map((column) => {
        values.push(this.serializeValue(state, this.table, column, payload[column]));
        return `${quoteIdent(column)} = $${values.length}`;
      })
      .join(", ");
    const shiftedWhere = whereSql.replace(/\$(\d+)/g, (_, index: string) => `$${Number(index) + values.length}`);
    const sql = `update public.${quoteIdent(this.table)} set ${setSql} ${shiftedWhere} returning *`;
    const result = await state.db.query<Record<string, unknown>>(sql, [...values, ...params]);
    return this.finishWrite(result.rows);
  }

  private async executeDelete(state: LocalState, whereSql: string, params: unknown[]): Promise<DbResult<unknown>> {
    const sql = `delete from public.${quoteIdent(this.table)} ${whereSql} returning *`;
    const result = await state.db.query<Record<string, unknown>>(sql, params);
    return this.finishWrite(result.rows, true);
  }

  private finishWrite(rows: Record<string, unknown>[], forceArray = false): DbResult<unknown> {
    const parsed = parseSelect(this.selectInput);
    const projected = rows.map((row) => project(row, parsed.columns));
    if (this.singleMode === "single") {
      if (rows.length === 0) {
        return { data: null, error: { message: "JSON object requested, multiple (or no) rows returned", code: "PGRST116" } };
      }
      return { data: projected[0], error: null };
    }
    if (this.singleMode === "maybe") return { data: projected[0] ?? null, error: null };
    if (!this.selectInput || this.selectInput === "*" || forceArray) return { data: projected, error: null };
    if (this.action === "insert" || this.action === "upsert") return { data: projected, error: null };
    return { data: projected, error: null };
  }
}
