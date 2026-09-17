import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Calculator, Plus } from "lucide-react";
import { toast } from "sonner";

import { AppShell, StatCard } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchChecklist,
  fetchProfiles,
  fetchSalesFrom,
  fetchSettings,
  fetchTodaySales,
  type Sale,
} from "@/lib/data";
import { formatIQD, formatTime, rowsActiveSince, weekStart } from "@/lib/factory";
import { useApp } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/employee")({
  head: () => ({
    meta: [
      { title: "پەڕەی کارمەندان | کارگەی سەھۆڵ" },
      { name: "description", content: "Employee panel: record ice row sales and complete the weekly maintenance checklist." },
      { property: "og:title", content: "Employee panel — Ice Factory" },
      { property: "og:description", content: "Record daily row sales and the weekly maintenance checklist." },
    ],
  }),
  component: EmployeePage,
});

function EmployeePage() {
  const { t } = useApp();

  return (
    <AppShell title={t("appName")} subtitle={t("employees")}>
      <Tabs defaultValue="sales" className="space-y-5">
        <TabsList className="w-full">
          <TabsTrigger value="sales" className="flex-1">
            {t("sales")}
          </TabsTrigger>
          <TabsTrigger value="calculator" className="flex-1">
            {t("calculator")}
          </TabsTrigger>
          <TabsTrigger value="checklist" className="flex-1">
            {t("checklist")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="sales">
          <SalesTab />
        </TabsContent>
        <TabsContent value="calculator">
          <CalculatorTab />
        </TabsContent>
        <TabsContent value="checklist">
          <ChecklistTab />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function SalesTab() {
  const { t } = useApp();
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const s = settings.data;

  const activeSales = useQuery({
    queryKey: ["sales", "active", s?.rows_released_at, s?.auto_release_enabled, s?.auto_release_hours],
    queryFn: () => fetchSalesFrom(rowsActiveSince(s)),
    enabled: !!s,
  });
  const todaySales = useQuery({ queryKey: ["sales", "today"], queryFn: fetchTodaySales });

  const [buyer, setBuyer] = useState("");
  const [rows, setRows] = useState("1");
  const [place, setPlace] = useState<"a" | "b">("a");
  const [paid, setPaid] = useState(true);
  const [emergency, setEmergency] = useState(false);

  const sold = (p: "a" | "b") =>
    (activeSales.data ?? []).filter((x) => x.place === p).reduce((sum, x) => sum + x.rows_count, 0);

  const remainingA = (s?.place_a_sellable ?? 28) - sold("a");
  const remainingB = (s?.place_b_sellable ?? 42) - sold("b");

  const addSale = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const rowsCount = Number(rows);
      if (!userData.user) throw new Error("no session");
      const { error } = await supabase.from("sales").insert({
        buyer_name: buyer.trim(),
        rows_count: rowsCount,
        place,
        paid,
        emergency,
        price_per_row: s?.price_per_row ?? 0,
        created_by: userData.user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setBuyer("");
      setRows("1");
      setEmergency(false);
      setPaid(true);
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.success(t("saved"));
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : t("errorTitle")),
  });

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label={`${t("remaining")} — ${t("placeA")}`}
          value={`${remainingA}`}
          hint={`${t("reserved")}: ${(s?.place_a_capacity ?? 32) - (s?.place_a_sellable ?? 28)}`}
          tone={remainingA <= 0 ? "destructive" : "default"}
        />
        <StatCard
          label={`${t("remaining")} — ${t("placeB")}`}
          value={`${remainingB}`}
          hint={`${t("reserved")}: ${(s?.place_b_capacity ?? 48) - (s?.place_b_sellable ?? 42)}`}
          tone={remainingB <= 0 ? "destructive" : "default"}
        />
        <StatCard
          label={t("rowsSoldToday")}
          value={`${sold("a") + sold("b")}`}
          hint={`${sold("a")} + ${sold("b")}`}
          tone="success"
        />
      </div>

      <form
        className="frost-panel grid gap-4 p-5 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          addSale.mutate();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="buyer">{t("buyerName")}</Label>
          <Input id="buyer" value={buyer} onChange={(e) => setBuyer(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rows">{t("rowsCount")}</Label>
          <Input
            id="rows"
            type="number"
            min={1}
            dir="ltr"
            value={rows}
            onChange={(e) => setRows(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>{t("place")}</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              className="flex-1"
              variant={place === "a" ? "default" : "secondary"}
              onClick={() => setPlace("a")}
            >
              {t("placeA")}
            </Button>
            <Button
              type="button"
              className="flex-1"
              variant={place === "b" ? "default" : "secondary"}
              onClick={() => setPlace("b")}
            >
              {t("placeB")}
            </Button>
          </div>
        </div>
        <div className="space-y-3 rounded-xl bg-muted/60 p-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="paid">{paid ? t("paid") : t("notPaid")}</Label>
            <Switch id="paid" checked={paid} onCheckedChange={setPaid} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="emergency">{t("emergency")}</Label>
            <Switch id="emergency" checked={emergency} onCheckedChange={setEmergency} />
          </div>
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" className="w-full" disabled={addSale.isPending}>
            <Plus className="size-4" />
            {addSale.isPending ? t("loading") : t("add")}
          </Button>
        </div>
      </form>

      <SalesList sales={todaySales.data ?? []} />
    </div>
  );
}

function CalculatorTab() {
  const { t } = useApp();
  const settings = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const price = settings.data?.price_per_row ?? 0;
  const [rows, setRows] = useState("1");
  const total = (Number(rows) || 0) * price;

  return (
    <div className="frost-panel space-y-5 p-5">
      <div className="flex items-center gap-2">
        <Calculator className="size-5 text-primary" />
        <div>
          <h2 className="font-bold">{t("calculator")}</h2>
          <p className="text-xs text-muted-foreground">{t("calcHint")}</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="calcRows">{t("rowsCount")}</Label>
        <Input
          id="calcRows"
          type="number"
          min={0}
          dir="ltr"
          value={rows}
          onChange={(e) => setRows(e.target.value)}
        />
      </div>

      <div className="rounded-xl bg-muted/60 p-4 text-center">
        <p className="text-xs text-muted-foreground">
          {`1 ${t("rows")} = ${formatIQD(price)} ${t("iqd")}`}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{t("result")}</p>
        <p className="text-3xl font-bold text-primary" dir="ltr">
          {formatIQD(total)}
        </p>
        <p className="text-xs text-muted-foreground">{t("iqd")}</p>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[1, 5, 10, 12].map((n) => (
          <Button key={n} type="button" variant="secondary" onClick={() => setRows(String(n))}>
            {n}
          </Button>
        ))}
      </div>
    </div>
  );
}

function SalesList({ sales }: { sales: Sale[] }) {
  const { t } = useApp();
  if (sales.length === 0) {
    return <p className="frost-panel p-5 text-center text-sm text-muted-foreground">{t("noData")}</p>;
  }
  return (
    <div className="frost-panel divide-y divide-border overflow-hidden">
      {sales.map((sale) => (
        <div key={sale.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
          <div>
            <p className="font-semibold">{sale.buyer_name}</p>
            <p className="text-xs text-muted-foreground">
              {sale.rows_count} {t("rows")} · {sale.place === "a" ? t("placeA") : t("placeB")} ·{" "}
              {formatTime(sale.created_at)}
              {sale.emergency ? ` · ${t("emergency")}` : ""}
            </p>
          </div>
          <p className={`text-xs font-semibold ${sale.paid ? "text-success" : "text-destructive"}`}>
            {sale.paid ? t("paid") : t("notPaid")}
          </p>
        </div>
      ))}
    </div>
  );
}

function ChecklistTab() {
  const { t, lang } = useApp();
  const queryClient = useQueryClient();
  const [week, setWeek] = useState(weekStart());
  useEffect(() => setWeek(weekStart()), []);

  const checklist = useQuery({
    queryKey: ["checklist", week],
    queryFn: () => fetchChecklist(week),
  });
  const profiles = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });

  const mark = useMutation({
    mutationFn: async (itemId: string) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("no session");
      const { error } = await supabase
        .from("checklist_completions")
        .insert({ item_id: itemId, week_start: week, done_by: userData.user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist"] });
      toast.success(t("saved"));
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : t("errorTitle")),
  });

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
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                {done ? (
                  <CheckCircle2 className="size-5 text-success" />
                ) : (
                  <Circle className="size-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-semibold">{lang === "ku" ? item.title_ku : item.title_ar}</p>
                  <p className="text-xs text-muted-foreground">
                    {done
                      ? `${t("done")} · ${t("doneBy")}: ${who?.full_name ?? who?.email ?? ""}`
                      : t("notDone")}
                  </p>
                </div>
              </div>
              {done ? null : (
                <Button size="sm" onClick={() => mark.mutate(item.id)} disabled={mark.isPending}>
                  {t("markDone")}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
