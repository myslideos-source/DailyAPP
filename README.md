# dayli

Der private Familienkalender von Domenico und Elisabeth — Termine, Aufgaben,
gemeinsame Zeit und Sparziele an einem warmen, ruhigen Ort. Gebaut als
installierbare PWA mit Next.js (App Router), TypeScript, Tailwind CSS,
Motion für React und Supabase.

## Entwicklung

```bash
npm install
npm run dev
```

Die App öffnet unter `http://localhost:3000` und läuft **sofort mit lokalen
Demo-Daten** — es ist kein Supabase-Projekt erforderlich. Alle Termine,
Aufgaben und Sparziele werden im `localStorage` des Browsers gespeichert.

## Mit Supabase verbinden (optional)

1. Ein Supabase-Projekt anlegen und `supabase/migrations/*.sql` ausführen
   (per Supabase CLI: `supabase db push`, oder im SQL-Editor des Dashboards
   in der angegebenen Reihenfolge).
2. `.env.example` nach `.env.local` kopieren und mit den Projektwerten
   (Settings → API) befüllen.
3. Optional lokal Demo-Accounts anlegen: `supabase db reset` führt
   `supabase/seed.sql` aus und erstellt die beiden Demo-Logins
   `domenico@dayli.app` / `elisabeth@dayli.app` (Passwort `dayli-demo`).

Ohne gesetzte Umgebungsvariablen bleibt die App automatisch im Demo-Modus.

## Skripte

- `npm run dev` – Entwicklungsserver
- `npm run build` – Production-Build
- `npm run start` – Production-Server
- `npm run lint` – ESLint

## Projektstruktur

```
app/                 Next.js App Router Routen (Heute, Kalender, Aufgaben, Mehr, Login)
components/          UI-Komponenten nach Bereich gruppiert
lib/                 Typen, Demo-Daten, State (React Context), Supabase-Clients
public/brand/        Original-Logo (unverändert)
public/icons/        Generierte PWA-Icon-Größen
supabase/migrations/ SQL-Schema, RLS-Policies, Funktionen
supabase/seed.sql    Lokale Demo-Daten für Supabase
```
