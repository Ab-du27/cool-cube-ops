import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_SETTINGS, startOfToday, type Settings } from "@/lib/factory";

export type Sale = {
  id: string;
  buyer_name: string;
  rows_count: number;
  place: string;
  paid: boolean;
  emergency: boolean;
  price_per_row: number;
  total_iqd: number;
  created_by: string;
  created_at: string;
};

export type Profile = { id: string; email: string; full_name: string | null };

export async function fetchRole(): Promise<"admin" | "employee" | null> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  if (data?.some((r) => r.role === "admin")) return "admin";
  return data && data.length > 0 ? "employee" : "employee";
}

export async function fetchSettings(): Promise<Settings> {
  const { data } = await supabase.from("settings").select("*").maybeSingle();
  if (!data) return DEFAULT_SETTINGS;
  return {
    price_per_row: Number(data.price_per_row),
    place_a_capacity: data.place_a_capacity,
    place_b_capacity: data.place_b_capacity,
    place_a_sellable: data.place_a_sellable,
    place_b_sellable: data.place_b_sellable,
    auto_release_hours: data.auto_release_hours ?? 17,
    auto_release_enabled: data.auto_release_enabled ?? true,
    rows_released_at: data.rows_released_at ?? null,
    checklist_auto_reset: data.checklist_auto_reset ?? true,
  };
}

export async function fetchSalesFrom(since: Date): Promise<Sale[]> {
  const { data, error } = await supabase
    .from("sales")
    .select("*")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Sale[];
}

export type EmployeeAccount = {
  id: string;
  user_id: string;
  email: string;
  password: string;
  full_name: string | null;
  created_at: string;
};

export async function fetchEmployeeAccounts(): Promise<EmployeeAccount[]> {
  const { data, error } = await supabase
    .from("employee_credentials")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as EmployeeAccount[];
}

export async function fetchTodaySales(): Promise<Sale[]> {
  const { data, error } = await supabase
    .from("sales")
    .select("*")
    .gte("created_at", startOfToday().toISOString())
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Sale[];
}

export async function fetchSalesSince(days: number): Promise<Sale[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from("sales")
    .select("*")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Sale[];
}

export async function fetchUnpaidSales(): Promise<Sale[]> {
  const { data, error } = await supabase
    .from("sales")
    .select("*")
    .eq("paid", false)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Sale[];
}

export async function fetchProfiles(): Promise<Record<string, Profile>> {
  const { data } = await supabase.from("profiles").select("id, email, full_name");
  const map: Record<string, Profile> = {};
  for (const p of data ?? []) map[p.id] = p as Profile;
  return map;
}

export type ChecklistItem = {
  id: string;
  key: string;
  title_ku: string;
  title_ar: string;
  sort_order: number;
};

export async function fetchChecklist(week: string) {
  const [items, completions] = await Promise.all([
    supabase.from("checklist_items").select("*").order("sort_order"),
    supabase.from("checklist_completions").select("*").eq("week_start", week),
  ]);
  return {
    items: (items.data ?? []) as ChecklistItem[],
    completions: (completions.data ?? []) as {
      id: string;
      item_id: string;
      done_by: string;
      done_at: string;
    }[],
  };
}
