import {
  MessageCircle,
  Brain,
  CheckCircle,
  Zap,
  Info,
} from "lucide-react";
import { Logo } from "@/components/logo";

export default function AboutPage() {
  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-elevation-1">
        <div className="border-b border-border px-6 py-4">
          <Logo size="lg" />
        </div>
        <div className="p-6">
          <p className="max-w-lg text-body-md text-ink-secondary">
            הכלי הפנימי של סוכנות Bright לניהול משימות ולקוחות. נבנה לפתור בעיה אחת: חיכוך.
          </p>
        </div>
      </div>

      {/* Story */}
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-elevation-1">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-base font-bold text-ink">הסיפור</h2>
        </div>
        <div className="p-5">
          <p className="text-body-sm leading-relaxed text-ink-secondary">
            BrightCRM נבנה כדי לפתור בעיה אמיתית. החיכוך בפתיחת משימות. במקום להיכנס למחשב, לפתוח טאב, לחפש את הלקוח ולמלא טופס, עכשיו אפשר פשוט לשלוח הודעת טלגרם. טקסט או קול. ה-AI מפענח, מזהה את הלקוח, ופותח משימה. בלי חיכוך, בלי תירוצים.
          </p>
        </div>
      </div>

      {/* How it works */}
      <section>
        <h2 className="mb-4 text-lg font-bold text-ink">איך זה עובד</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <HowStep
            icon={<MessageCircle className="h-6 w-6 text-white" />}
            color="#4262FF"
            title="שולחים הודעה"
            desc="טקסט או הקלטה קולית בטלגרם. בעברית, כמו שמדברים."
          />
          <HowStep
            icon={<Brain className="h-6 w-6 text-white" />}
            color="#A25DDC"
            title="AI מפענח"
            desc="Claude מזהה את הלקוח, מפענח את המשימה, ומציע דדליין."
          />
          <HowStep
            icon={<CheckCircle className="h-6 w-6 text-white" />}
            color="#00C875"
            title="המשימה נוצרת"
            desc="אישור בלחיצה אחת. המשימה נכנסת למערכת מיד."
          />
        </div>
      </section>

      {/* Tech stack */}
      <section>
        <h2 className="mb-4 text-lg font-bold text-ink">טכנולוגיה</h2>
        <div className="flex flex-wrap gap-2">
          {["Next.js", "Supabase", "Claude AI", "Whisper", "Telegram Bot API", "Vercel", "Tailwind CSS", "TypeScript"].map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-caption font-medium text-ink-secondary shadow-elevation-1">
              <Zap className="h-3 w-3 text-primary" />
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* Version */}
      <div className="border-t border-border pt-6 text-caption text-ink-muted">
        גרסה 1.0 &middot; מאי 2026
      </div>
    </div>
  );
}

function HowStep({ icon, color, title, desc }: { icon: React.ReactNode; color: string; title: string; desc: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-elevation-1">
      <div className="flex items-center gap-2 px-4 py-3" style={{ backgroundColor: color }}>
        {icon}
        <h3 className="text-sm font-bold text-white">{title}</h3>
      </div>
      <div className="p-4">
        <p className="text-caption text-ink-secondary">{desc}</p>
      </div>
    </div>
  );
}
