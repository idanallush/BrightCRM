import {
  MessageCircle,
  Brain,
  CheckCircle,
  Zap,
} from "lucide-react";

export default function AboutPage() {
  return (
    <div className="flex flex-col gap-10">
      {/* Hero */}
      <section className="rounded-lg bg-gradient-to-bl from-tint-lavender via-white to-white p-8 md:p-12">
        <div className="flex items-center gap-3 mb-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-lg font-bold text-white shadow-subtle">
            B
          </span>
          <h1 className="text-3xl font-semibold text-ink md:text-4xl">BrightCRM</h1>
        </div>
        <p className="max-w-lg text-lg text-slate">
          הכלי הפנימי של סוכנות Bright לניהול משימות ולקוחות. נבנה לפתור בעיה אחת: חיכוך.
        </p>
      </section>

      {/* Story */}
      <section className="max-w-2xl">
        <h2 className="mb-3 text-xl font-semibold text-ink">הסיפור</h2>
        <p className="text-[15px] leading-relaxed text-slate">
          BrightCRM נבנה כדי לפתור בעיה אמיתית. החיכוך בפתיחת משימות. במקום להיכנס למחשב, לפתוח טאב, לחפש את הלקוח ולמלא טופס, עכשיו אפשר פשוט לשלוח הודעת טלגרם. טקסט או קול. ה-AI מפענח, מזהה את הלקוח, ופותח משימה. בלי חיכוך, בלי תירוצים.
        </p>
      </section>

      {/* How it works */}
      <section>
        <h2 className="mb-6 text-xl font-semibold text-ink">איך זה עובד</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <HowStep
            icon={<MessageCircle className="h-7 w-7 text-primary" />}
            title="שולחים הודעה"
            desc="טקסט או הקלטה קולית בטלגרם. בעברית, כמו שמדברים."
          />
          <HowStep
            icon={<Brain className="h-7 w-7 text-st-working" />}
            title="AI מפענח"
            desc="Claude מזהה את הלקוח, מפענח את המשימה, ומציע דדליין."
          />
          <HowStep
            icon={<CheckCircle className="h-7 w-7 text-success" />}
            title="המשימה נוצרת"
            desc="אישור בלחיצה אחת. המשימה נכנסת למערכת מיד."
          />
        </div>
      </section>

      {/* Tech stack */}
      <section>
        <h2 className="mb-4 text-xl font-semibold text-ink">טכנולוגיה</h2>
        <div className="flex flex-wrap gap-2">
          {["Next.js", "Supabase", "Claude AI", "Whisper", "Telegram Bot API", "Vercel", "Tailwind CSS", "TypeScript"].map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-white px-3 py-1.5 text-caption font-medium text-slate">
              <Zap className="h-3 w-3 text-primary" />
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* Version */}
      <div className="border-t border-hairline pt-6 text-caption text-stone">
        גרסה 1.0 &middot; מאי 2026
      </div>
    </div>
  );
}

function HowStep({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-lg border border-hairline bg-white p-6 shadow-subtle">
      <div className="mb-3">{icon}</div>
      <h3 className="mb-1 text-[15px] font-semibold text-ink">{title}</h3>
      <p className="text-caption text-slate">{desc}</p>
    </div>
  );
}
