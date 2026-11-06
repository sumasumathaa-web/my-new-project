/**
 * Adapts the supabase-js client to the application's DataClient port, so the
 * same call-sites work against Supabase (production) or embedded Postgres (local).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthApi, DataClient, DbQuery, DbResult, OrderOptions, SelectOptions, StorageApi } from "@/lib/db/core";

type AnyBuilder = Record<string, (...args: never[]) => AnyBuilder> & PromiseLike<unknown>;

class SupabaseQuery<T = any> implements DbQuery<T> {
  constructor(private builder: AnyBuilder) {}

  private call(method: string, ...args: unknown[]): this {
    const fn = (this.builder as unknown as Record<string, (...a: unknown[]) => AnyBuilder>)[method];
    if (typeof fn !== "function") throw new Error(`Unsupported query method: ${method}`);
    this.builder = fn.apply(this.builder, args);
    return this;
  }

  select(columns?: string, options?: SelectOptions): this {
    return this.call("select", columns, options);
  }
  insert(values: Record<string, unknown> | Record<string, unknown>[]): this {
    return this.call("insert", values);
  }
  update(values: Record<string, unknown>): this {
    return this.call("update", values);
  }
  upsert(
    values: Record<string, unknown> | Record<string, unknown>[],
    options?: { onConflict?: string; ignoreDuplicates?: boolean },
  ): this {
    return this.call("upsert", values, options);
  }
  delete(): this {
    return this.call("delete");
  }
  eq(column: string, value: unknown): this {
    return this.call("eq", column, value);
  }
  neq(column: string, value: unknown): this {
    return this.call("neq", column, value);
  }
  gt(column: string, value: unknown): this {
    return this.call("gt", column, value);
  }
  gte(column: string, value: unknown): this {
    return this.call("gte", column, value);
  }
  lt(column: string, value: unknown): this {
    return this.call("lt", column, value);
  }
  lte(column: string, value: unknown): this {
    return this.call("lte", column, value);
  }
  in(column: string, values: readonly unknown[]): this {
    return this.call("in", column, values);
  }
  is(column: string, value: boolean | null): this {
    return this.call("is", column, value);
  }
  ilike(column: string, pattern: string): this {
    return this.call("ilike", column, pattern);
  }
  like(column: string, pattern: string): this {
    return this.call("like", column, pattern);
  }
  or(filters: string): this {
    return this.call("or", filters);
  }
  order(column: string, options?: OrderOptions): this {
    return this.call("order", column, options);
  }
  limit(count: number): this {
    return this.call("limit", count);
  }
  range(from: number, to: number): this {
    return this.call("range", from, to);
  }
  single(): this {
    return this.call("single");
  }
  maybeSingle(): this {
    return this.call("maybeSingle");
  }
  then<A = DbResult<T>, B = never>(
    onFulfilled?: ((value: DbResult<T>) => A | PromiseLike<A>) | null,
    onRejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return Promise.resolve(this.builder as unknown as PromiseLike<DbResult<T>>).then(
      onFulfilled as never,
      onRejected as never,
    ) as PromiseLike<A | B>;
  }
}

export function supabaseDataClient(client: SupabaseClient): DataClient {
  return {
    from<T = any>(table: string): DbQuery<T> {
      return new SupabaseQuery<T>(client.from(table) as unknown as AnyBuilder);
    },
    storage: client.storage as unknown as StorageApi,
    auth: client.auth as unknown as AuthApi,
  };
}
