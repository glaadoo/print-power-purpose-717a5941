import { supabase } from "@/integrations/supabase/client";

// Store a per-browser cart session id in localStorage
const KEY = "cart_session_id";

function uuid4() {
  // lightweight UUID v4
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,c=>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

export function getCartSessionId(): string {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = uuid4();
    localStorage.setItem(KEY, id);
  }
  return id;
}

export async function addToCart(productId: string, qty: number) {
  const sessionId = getCartSessionId();
  // upsert (increase qty if exists)
  const { data, error } = await supabase
    .from("cart_items")
    .upsert(
      { session_id: sessionId, product_id: productId, qty },
      { onConflict: "session_id,product_id" }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getCart() {
  const sessionId = getCartSessionId();
  // join with products for names/prices
  const { data, error } = await supabase
    .from("cart_items")
    .select("id, qty, product_id, products:product_id (name, base_cost_cents)")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function updateCartItem(id: string, qty: number) {
  const { data, error } = await supabase
    .from("cart_items")
    .update({ qty })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeCartItem(id: string) {
  const { error } = await supabase.from("cart_items").delete().eq("id", id);
  if (error) throw error;
}

export async function clearCart() {
  const sessionId = getCartSessionId();
  const { error } = await supabase.from("cart_items").delete().eq("session_id", sessionId);
  if (error) throw error;
}
