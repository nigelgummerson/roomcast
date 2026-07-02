import { Logo } from "../ui/Logo";
import { buttonClasses } from "../ui/Button";
import { Card } from "../ui/Card";
import { IconCamera, IconShield } from "../ui/icons";
import { APP_VERSION_DISPLAY } from "../version";

const STEPS = [
  {
    title: "Drop",
    body: "Drop a document into the presenter — no upload, it never leaves this device.",
  },
  {
    title: "Beam",
    body: "The room sees it as a live, animated QR code projected on screen.",
  },
  {
    title: "Scan to keep",
    body: "Everyone scans it to their own phone. Confidential copies expire after the time you choose; Standard copies stay.",
  },
];

export function HomePage() {
  return (
    <div className="min-h-[var(--app-height)] bg-white text-slate-900">
      <header className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-4">
        <a href="#home" className="flex items-center gap-2 font-semibold">
          <Logo size={28} />
          RoomCast
        </a>
        <div className="flex items-center gap-2">
          <a href="#present" className={buttonClasses("primary")}>
            Present
          </a>
          <a href="#reader" className={buttonClasses("ghost")}>
            Receive
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-12 px-6 pb-16">
        <section className="space-y-6 py-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight">RoomCast</h1>
          <p className="mx-auto max-w-xl text-lg text-slate-600">
            Beam any document to the whole room. Everyone scans it to their phone —
            you set how long it lasts, then it&rsquo;s gone.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a href="#present" className={buttonClasses("primary")}>
              Broadcast a document
            </a>
            <a href="#reader" className={buttonClasses("ghost")}>
              Receive a document
            </a>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((step) => (
            <Card key={step.title} className="space-y-2 text-center">
              <h2 className="font-semibold text-[var(--rc-accent)]">{step.title}</h2>
              <p className="text-sm text-slate-600">{step.body}</p>
            </Card>
          ))}
        </section>

        <section>
          <Card className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <IconShield size={24} className="shrink-0 text-[var(--rc-accent)]" />
            <div className="space-y-1">
              <h2 className="font-semibold">Confidential by default</h2>
              <p className="text-sm text-slate-600">
                RoomCast works entirely offline, in the browser — there is no server,
                no upload, and no account. Documents pass from screen to phone by
                camera scan only, and self-expire on the schedule you set.
              </p>
              <p className="text-sm text-slate-600">
                <IconCamera size={14} className="mr-1 inline align-text-bottom" />
                Dummy data only until an Information Governance / DPIA sign-off is in
                place — see the project&rsquo;s DPIA draft before using real
                patient-identifiable data.
              </p>
            </div>
          </Card>
        </section>
      </main>

      <footer className="mx-auto max-w-4xl space-y-1 px-6 py-8 text-center text-xs text-slate-500">
        <p>Developed in Leeds.</p>
        <p>v{APP_VERSION_DISPLAY}</p>
      </footer>
    </div>
  );
}
