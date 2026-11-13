import { logout } from "@/app/actions";
import { IconLogout } from "@/components/icons";
import { NavLinks } from "@/components/nav";
import { SetupButton } from "@/components/setup-button";
import { requireSession } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireSession();
  const bot = process.env.TELEGRAM_BOT_USERNAME;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">F</span>
          <span className="brand-name">Fin</span>
        </div>
        <nav className="nav" aria-label="Principal">
          <NavLinks />
        </nav>
        <div className="sidebar-foot">
          <div className="tg-hint" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <strong>Registre pelo Telegram</strong>
              Mande “gastei 42 no ifood”{" "}
              {bot ? (
                <>
                  para{" "}
                  <a
                    href={`https://t.me/${bot}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "var(--accent)", fontWeight: 700 }}
                  >
                    @{bot}
                  </a>
                </>
              ) : (
                "para o seu bot"
              )}{" "}
              e veja aqui na hora.
            </div>
            <SetupButton label="Sincronizar Neon + Telegram" />
          </div>
          <form action={logout}>
            <button id="logout-button" className="nav-link" style={{ border: 0, background: "none", width: "100%", cursor: "pointer" }}>
              <IconLogout />
              <span>Sair</span>
            </button>
          </form>
        </div>
      </aside>

      <main className="main">
        <div className="main-inner">{children}</div>
      </main>

      <nav className="tabbar" aria-label="Navegação">
        <NavLinks compact />
      </nav>
    </div>
  );
}
