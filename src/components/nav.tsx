"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconChat, IconHome, IconList, IconTarget } from "@/components/icons";

const LINKS = [
  { href: "/", label: "Visão geral", short: "Início", Icon: IconHome },
  { href: "/transacoes", label: "Lançamentos", short: "Lançamentos", Icon: IconList },
  { href: "/metas", label: "Metas e orçamentos", short: "Metas", Icon: IconTarget },
  { href: "/chat", label: "Conversar com o Fin", short: "Chat", Icon: IconChat },
];

export function NavLinks({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  return (
    <>
      {LINKS.map(({ href, label, short, Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            id={`nav-${compact ? "m-" : ""}${short.toLowerCase()}`}
            className="nav-link"
            aria-current={active ? "page" : undefined}
          >
            <Icon />
            <span>{compact ? short : label}</span>
          </Link>
        );
      })}
    </>
  );
}
