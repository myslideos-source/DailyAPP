import { BackLink } from "@/components/mehr/BackLink";

const SECTIONS = [
  {
    title: "Wer sieht eure Daten",
    body: "dayli ist ausschließlich für Domenico und Elisabeth bestimmt. Es gibt keine öffentliche Registrierung und keine geteilten Inhalte außerhalb eurer Familien-ID.",
  },
  {
    title: "Wo eure Daten liegen",
    body: "Solange keine Supabase-Zugangsdaten hinterlegt sind, laufen alle Inhalte ausschließlich lokal auf diesem Gerät (localStorage). Sobald ein Supabase-Projekt verbunden ist, werden Termine, Aufgaben und Sparziele verschlüsselt über euer privates Projekt synchronisiert.",
  },
  {
    title: "Row Level Security",
    body: "Auf Datenbankebene stellt Row Level Security sicher, dass ausschließlich Mitglieder eurer Familie lesen oder schreiben können – siehe supabase/migrations für die genauen Regeln.",
  },
  {
    title: "Keine Weitergabe",
    body: "dayli teilt keine Daten mit Dritten, enthält keine Werbung und kein Tracking über die reine App-Funktion hinaus.",
  },
];

export default function DatenschutzPage() {
  return (
    <div className="pt-3 pb-6">
      <BackLink />
      <h1 className="mb-1 text-[22px] font-bold" style={{ color: "var(--dl-text)" }}>
        Datenschutz
      </h1>
      <p className="mb-5 text-[13.5px]" style={{ color: "var(--dl-text-dim)" }}>
        Kurz und ehrlich – so geht dayli mit euren Daten um.
      </p>

      <div className="flex flex-col gap-3.5">
        {SECTIONS.map((s) => (
          <div key={s.title} className="rounded-[16px] border p-4" style={{ borderColor: "var(--dl-border)", background: "var(--dl-card)" }}>
            <p className="text-[14px] font-semibold" style={{ color: "var(--dl-text)" }}>
              {s.title}
            </p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed" style={{ color: "var(--dl-text-dim)" }}>
              {s.body}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
