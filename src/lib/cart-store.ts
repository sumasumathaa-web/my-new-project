"use client";

/**
 * Browser cart: stores ONLY lightweight line references (productId, quantity,
 * choices). Prices/totals are NEVER trusted from here — the server recomputes
 * everything at checkout from the database.
 */
export interface CartLine {
  productId: string;
  name: string;
  slug: string;
  kind: string;
  price: number; // display hint only
  quantity: number;
  addons: string[];
  options?: Record<string, unknown>;
}

const KEY = "wip_cart_v1";
const EVENT = "wip-cart-change";

export function readCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l): l is CartLine =>
        l && typeof l.productId === "string" && typeof l.quantity === "number" && l.quantity > 0,
    );
  } catch {
    return [];
  }
}

export function writeCart(lines: CartLine[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(lines));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function addToCart(line: CartLine): CartLine[] {
  const lines = readCart();
  const idx = lines.findIndex((l) => l.productId === line.productId);
  if (idx >= 0) {
    lines[idx] = { ...lines[idx], quantity: Math.min(10, lines[idx].quantity + line.quantity) };
  } else {
    lines.push({ ...line, quantity: Math.min(10, Math.max(1, line.quantity)) });
  }
  writeCart(lines);
  return lines;
}

export function removeFromCart(productId: string): CartLine[] {
  const lines = readCart().filter((l) => l.productId !== productId);
  writeCart(lines);
  return lines;
}

export function setQuantity(productId: string, quantity: number): CartLine[] {
  const lines = readCart().map((l) =>
    l.productId === productId ? { ...l, quantity: Math.min(10, Math.max(1, quantity)) } : l,
  );
  writeCart(lines);
  return lines;
}

export function clearCart(): void {
  writeCart([]);
}

export function cartCount(): number {
  return readCart().reduce((s, l) => s + l.quantity, 0);
}

export function onCartChange(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
