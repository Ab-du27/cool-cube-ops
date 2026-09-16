import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { AppShell, StatCard } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchChecklist,
  fetchProfiles,
  fetchRole,
  fetchSalesSince,
  fetchSettings,
  fetchTodaySales,
  fetchUnpaidSales,
  type Sale,
} from "@/lib/data";
import { formatDate, formatIQD, formatTime, weekStart } from "@/lib/factory";
import { useApp } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "پەڕەی بەڕێوەبەر | کارگەی سەھۆڵ" },
      {
        name: "description",
        content: "Manager panel: daily income in IQD, debts, remaining rows, weekly checklist status and monthly sales chart.",
      },
      { property: "og:title", content: "Manager panel — Ice Factory" },
      {
        property: "og:description",
        content: "Track daily income, unpaid buyers, remaining rows and monthly sales growth.",
      },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { t } = useApp();
  const navigate = useNavigate();
  const role = useQuery({ queryKey: ["role"], queryFn: fetchRole });

  useEffect(() => {
    if (role.data === "employee") navigate({ to: "/employee", replace: true });
  }, [role.data, navigate]);

  return (
    <AppShell title={t("appName")} subtitle={t("admin")}>
      <Tabs defaultValue="dashboard" className="space-y-5">
        <TabsList className="w-full flex-wrap">
          <TabsTrigger value="dashboard" className="flex-1">
            {t("dashboard")}
          </TabsTrigger>
          <TabsTrigger value="sales" className="flex-1">
            {t("sales")}
          </TabsTrigger>
          <TabsTrigger value="checklist" className="flex-1">
            {t("checklist")}
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex-1">
            {t("settings")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard">
          <DashboardTab />
        </TabsContent>
        <TabsContent value="sales">
          <AdminSalesTab />
        </TabsContent>
        <TabsContent value="checklist">
          <AdminChecklistTab />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function DashboardTab() {
  const { t } = useApp();
  const settings = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const today = useQuery({ queryKey: ["sales", "today"], queryFn: fetchTodaySales });
  const unpaid = useQuery({ queryKey: ["sales", "unpaid"], queryFn: fetchUnpaidSales });
  const history = useQuery({ queryKey: ["sales", "history"], queryFn: () => fetchSalesSince(365) });

  const s = settings.data;
  const soldA = (today.data ?? []).filter((x) => x.place === "a").reduce((n, x) => n + x.rows_count, 0);
  const soldB = (today.data ?? []).filter((x) => x.place === "b").reduce((n, x) => n + x.rows_count, 0);
  const collected = (today.data ?? [])
    .filter((x) => x.paid)
    .reduce((n, x) => n + Number(x.total_iqd), 0);
  const unpaidTotal = (unpaid.data ?? []).reduce((n, x) => n + Number(x.total_iqd), 0);

  const monthly = useMemo(() => {
    const map = new Map<string, number>();
    for (const sale of history.data ?? []) {
      const key = sale.created_at.slice(0, 7);
      map.set(key, (map.get(key) ?? 0) + Number(sale.total_iqd));
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, total]) => ({ month, total }));
  }, [history.data]);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("collectedToday")}
          value={`${formatIQD(collected)} ${t("iqd")}`}
          tone="success"
        />
        <StatCard
          label={t("unpaidTotal")}
          value={`${formatIQD(unpaidTotal)} ${t("iqd")}`}
          tone="destructive"
        />
        <StatCard label={t("rowsSoldToday")} value={`${soldA + soldB}`} hint={`${soldA} + ${soldB}`} />
        <StatCard
          label={t("remaining")}
          value={`${(s?.place_a_sellable ?? 28) - soldA} / ${(s?.place_b_sellable ?? 42) - soldB}`}
          hint={t("place")}
          tone="warning"
        />
      </div>

      <div className="frost-panel p-5">
        <h2 className="mb-4 font-bold">{t("monthlyChart")}</h2>
        <div className="h-72 w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "12px",
                  color: "var(--color-card-foreground)",
                }}
                formatter={(value: number) => `${formatIQD(value)} ${t("iqd")}`}
              />
              <Bar dataKey="total" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <DebtorsList />
    </div>
  );
}

function DebtorsList() {
  const { t } = useApp();
  const unpaid = useQuery({ queryKey: ["sales", "unpaid"], queryFn: fetchUnpaidSales });
  const profiles = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });
  const queryClient = useQueryClient();

  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sales").update({ paid: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.success(t("saved"));
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : t("errorTitle")),
  });

  return (
    <div className="frost-panel overflow-hidden">
      <h2 className="border-b border-border p-4 font-bold">{t("debtors")}</h2>
      {(unpaid.data ?? []).length === 0 ? (
        <p className="p-5 text-center text-sm text-muted-foreground">{t("noData")}</p>
      ) : (
        <div className="divide-y divide-border">
          {(unpaid.data ?? []).map((sale) => {
            const who = profiles.data?.[sale.created_by];
            return (
              <div key={sale.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
                <div>
                  <p className="font-semibold">{sale.buyer_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(sale.created_at)} · {sale.rows_count} {t("rows")} · {t("seller")}:{" "}
                    {who?.full_name ?? who?.email ?? ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-bold text-destructive">
                    {formatIQD(Number(sale.total_iqd))} {t("iqd")}
                  </p>
                  <Button size="sm" onClick={() => markPaid.mutate(sale.id)}>
                    {t("markPaid")}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AdminSalesTab() {
  const { t } = useApp();
  const queryClient = useQueryClient();
  const sales = useQuery({ queryKey: ["sales", "recent"], queryFn: () => fetchSalesSince(30) });
  const profiles = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sales").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.success(t("saved"));
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : t("errorTitle")),
  });

  const togglePaid = useMutation({
    mutationFn: async (sale: Sale) => {
      const { error } = await supabase.from("sales").update({ paid: !sale.paid }).eq("id", sale.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sales"] }),
    onError: (error) => toast.error(error instanceof Error ? error.message : t("errorTitle")),
  });

  if ((sales.data ?? []).length === 0) {
    return <p className="frost-panel p-5 text-center text-sm text-muted-foreground">{t("noData")}</p>;
  }

  return (
    <div className="frost-panel divide-y divide-border overflow-hidden">
      {(sales.data ?? []).map((sale) => {
        const who = profiles.data?.[sale.created_by];
        return (
          <div key={sale.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-semibold">{sale.buyer_name}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(sale.created_at)} {formatTime(sale.created_at)} · {sale.rows_count}{" "}
                {t("rows")} · {sale.place === "a" ? t("placeA") : t("placeB")} · {t("seller")}:{" "}
                {who?.full_name ?? who?.email ?? ""}
                {sale.emergency ? ` · ${t("emergency")}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <p className="font-bold">
                {formatIQD(Number(sale.total_iqd))} {t("iqd")}
              </p>
              <Button
                size="sm"
                variant={sale.paid ? "secondary" : "default"}
                onClick={() => togglePaid.mutate(sale)}
              >
                {sale.paid ? t("paid") : t("markPaid")}
              </Button>
              <Button
                size="icon"
                variant="destructive"
                aria-label={t("delete")}
                onClick={() => remove.mutate(sale.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AdminChecklistTab() {
  const { t, lang } = useApp();
  const [week, setWeek] = useState(weekStart());
  useEffect(() => setWeek(weekStart()), []);
  const checklist = useQuery({ queryKey: ["checklist", week], queryFn: () => fetchChecklist(week) });
  const profiles = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });

  return (
    <div className="space-y-4">
      <div className="frost-panel p-4">
        <h2 className="font-bold">{t("weeklyChecklist")}</h2>
        <p className="text-xs text-muted-foreground" dir="ltr">
          {week}
        </p>
      </div>
      <div className="frost-panel divide-y divide-border overflow-hidden">
        {(checklist.data?.items ?? []).map((item) => {
          const done = checklist.data?.completions.find((c) => c.item_id === item.id);
          const who = done ? profiles.data?.[done.done_by] : undefined;
          return (
            <div key={item.id} className="flex items-center gap-3 p-4">
              {done ? (
                <CheckCircle2 className="size-5 text-success" />
              ) : (
                <Circle className="size-5 text-destructive" />
              )}
              <div>
                <p className="font-semibold">{lang === "ku" ? item.title_ku : item.title_ar}</p>
                <p className="text-xs text-muted-foreground">
                  {done
                    ? `${t("done")} · ${t("doneBy")}: ${who?.full_name ?? who?.email ?? ""} · ${formatDate(done.done_at)}`
                    : t("notDone")}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SettingsTab() {
  const { t } = useApp();
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (settings.data) {
      setForm({
        price_per_row: String(settings.data.price_per_row),
        place_a_capacity: String(settings.data.place_a_capacity),
        place_b_capacity: String(settings.data.place_b_capacity),
        place_a_sellable: String(settings.data.place_a_sellable),
        place_b_sellable: String(settings.data.place_b_sellable),
      });
    }
  }, [settings.data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("settings")
        .update({
          price_per_row: Number(form["price_per_row"] ?? 0),
          place_a_capacity: Number(form["place_a_capacity"] ?? 32),
          place_b_capacity: Number(form["place_b_capacity"] ?? 48),
          place_a_sellable: Number(form["place_a_sellable"] ?? 28),
          place_b_sellable: Number(form["place_b_sellable"] ?? 42),
          updated_at: new Date().toISOString(),
        })
        .eq("id", true);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success(t("saved"));
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : t("errorTitle")),
  });

  const field = (name: string, label: string) => (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        type="number"
        min={0}
        dir="ltr"
        value={form[name] ?? ""}
        onChange={(e) => setForm((prev) => ({ ...prev, [name]: e.target.value }))}
      />
    </div>
  );

  return (
    <form
      className="frost-panel grid gap-4 p-5 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <div className="sm:col-span-2">{field("price_per_row", t("pricePerRow"))}</div>
      {field("place_a_capacity", t("capacityA"))}
      {field("place_b_capacity", t("capacityB"))}
      {field("place_a_sellable", t("sellableA"))}
      {field("place_b_sellable", t("sellableB"))}
      <div className="sm:col-span-2">
        <Button type="submit" className="w-full" disabled={save.isPending}>
          <Save className="size-4" />
          {save.isPending ? t("loading") : t("save")}
        </Button>
      </div>
    </form>
  );
}
