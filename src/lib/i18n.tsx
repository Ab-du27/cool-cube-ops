import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "ku" | "ar";
export type Theme = "light" | "dark";

const dict = {
  ku: {
    appName: "کارگەی سەھۆڵ",
    employees: "کارمەندان",
    admin: "بەڕێوەبەر",
    signIn: "چوونەژوورەوە",
    signUp: "دروستکردنی هەژمار",
    email: "ئیمەیل",
    password: "وشەی نهێنی",
    fullName: "ناوی تەواو",
    loading: "چاوەڕوان بە...",
    logout: "چوونەدەرەوە",
    sales: "فرۆشتن",
    checklist: "لیستی پشکنین",
    buyerName: "ناوی کڕیار",
    rows: "ڕیز",
    rowsCount: "ژمارەی ڕیزەکان",
    place: "شوێن",
    placeA: "شوێنی یەک (٣٢ ڕیز)",
    placeB: "شوێنی دوو (٤٨ ڕیز)",
    paid: "پارەی دا",
    notPaid: "پارە نەدا",
    emergency: "دۆخی لەپڕ",
    add: "زیادکردن",
    today: "ئەمڕۆ",
    todaySales: "فرۆشتنی ئەمڕۆ",
    remaining: "ڕیزی نەفرۆشراو",
    total: "کۆی گشتی",
    iqd: "دینار",
    seller: "فرۆشیار",
    time: "کات",
    weeklyChecklist: "لیستی پشکنینی هەفتانە",
    doneBy: "کرا لەلایەن",
    markDone: "نیشانەکردن وەک کراو",
    notDone: "نەکراوە",
    done: "کراوە",
    dashboard: "داشبۆرد",
    collectedToday: "پارەی کۆکراوەی ئەمڕۆ",
    unpaidTotal: "قەرزی نەدراو",
    debtors: "قەرزارەکان",
    monthlyChart: "هێڵکاری فرۆشتنی مانگانە",
    settings: "ڕێکخستن",
    pricePerRow: "نرخی هەر ڕیزێک (دینار)",
    save: "پاشەکەوتکردن",
    saved: "پاشەکەوتکرا",
    capacityA: "توانای شوێنی یەک",
    capacityB: "توانای شوێنی دوو",
    sellableA: "بۆ فرۆشتن لە شوێنی یەک",
    sellableB: "بۆ فرۆشتن لە شوێنی دوو",
    reserved: "پاراستوو",
    markPaid: "وەک دراو نیشانە بکە",
    noData: "هیچ داتایەک نییە",
    employee: "کارمەند",
    lang: "زمان",
    goEmployee: "پەڕەی کارمەندان",
    goAdmin: "پەڕەی بەڕێوەبەر",
    welcome: "بەخێربێن",
    signInOnce: "تەنها یەک جار بچۆرەوە، پاشان بەردەوام دەبێت",
    errorTitle: "هەڵە",
    rowsSoldToday: "ڕیزی فرۆشراو ئەمڕۆ",
    delete: "سڕینەوە",
    month: "مانگ",
  },
  ar: {
    appName: "مصنع الثلج",
    employees: "الموظفون",
    admin: "المدير",
    signIn: "تسجيل الدخول",
    signUp: "إنشاء حساب",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    fullName: "الاسم الكامل",
    loading: "جارٍ التحميل...",
    logout: "تسجيل الخروج",
    sales: "البيع",
    checklist: "قائمة الفحص",
    buyerName: "اسم المشتري",
    rows: "صف",
    rowsCount: "عدد الصفوف",
    place: "المكان",
    placeA: "المكان الأول (٣٢ صف)",
    placeB: "المكان الثاني (٤٨ صف)",
    paid: "دفع",
    notPaid: "لم يدفع",
    emergency: "حالة طارئة",
    add: "إضافة",
    today: "اليوم",
    todaySales: "مبيعات اليوم",
    remaining: "الصفوف غير المبيعة",
    total: "المجموع",
    iqd: "دينار",
    seller: "البائع",
    time: "الوقت",
    weeklyChecklist: "قائمة الفحص الأسبوعية",
    doneBy: "أنجزها",
    markDone: "تحديد كمنجز",
    notDone: "لم يتم",
    done: "تم",
    dashboard: "لوحة التحكم",
    collectedToday: "المبلغ المحصل اليوم",
    unpaidTotal: "إجمالي غير المدفوع",
    debtors: "المدينون",
    monthlyChart: "مخطط المبيعات الشهري",
    settings: "الإعدادات",
    pricePerRow: "سعر الصف (دينار)",
    save: "حفظ",
    saved: "تم الحفظ",
    capacityA: "سعة المكان الأول",
    capacityB: "سعة المكان الثاني",
    sellableA: "المتاح للبيع في المكان الأول",
    sellableB: "المتاح للبيع في المكان الثاني",
    reserved: "محتفظ به",
    markPaid: "تحديد كمدفوع",
    noData: "لا توجد بيانات",
    employee: "موظف",
    lang: "اللغة",
    goEmployee: "صفحة الموظفين",
    goAdmin: "صفحة المدير",
    welcome: "أهلاً بك",
    signInOnce: "سجّل الدخول مرة واحدة وسيبقى الحساب مفتوحاً",
    errorTitle: "خطأ",
    rowsSoldToday: "الصفوف المبيعة اليوم",
    delete: "حذف",
    month: "الشهر",
  },
} as const;

export type Key = keyof (typeof dict)["ku"];

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: Key) => string;
  theme: Theme;
  toggleTheme: () => void;
};

const AppContext = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ku");
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const storedLang = localStorage.getItem("ice-lang") as Lang | null;
    const storedTheme = localStorage.getItem("ice-theme") as Theme | null;
    if (storedLang) setLangState(storedLang);
    if (storedTheme) setTheme(storedTheme);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = "rtl";
    localStorage.setItem("ice-lang", lang);
  }, [lang]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("ice-theme", theme);
  }, [theme]);

  const value: Ctx = {
    lang,
    setLang: setLangState,
    t: (k) => dict[lang][k],
    theme,
    toggleTheme: () => setTheme((p) => (p === "dark" ? "light" : "dark")),
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
