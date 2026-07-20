import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser, canSeeAgentes } from "@/lib/auth";
import { logout } from "../actions";
import CommandCenter, { type Fleet } from "@/components/command-center";
import ApprovalsSection from "@/components/approvals-section";
import InsightsPanels from "@/components/insights-panels";
import { loadAll, loadInsights, licitaUnits, melhoriaUnits, telFor, timeAgo } from "@/lib/fleet-data";

export const dynamic = "force-dynamic";
const PROJS = ["licita360"];

export default async function LicitaPage() {
  const me = await currentUser();
  if (!me) redirect("/login");
  if (!canSeeAgentes(me.role)) redirect("/login");

  const { board, feed, approvals } = await loadAll();
  const ins = await loadInsights("licita360");
  const ops = licitaUnits(board, approvals);
  const inov = melhoriaUnits("licita360", approvals);
  const appr = approvals.filter((a) => a.projeto === "licita360");
  const fails = board.filter((b) => PROJS.includes(b.projeto) && b.status === "FAIL").length;
  const lfeed = feed.filter((r) => PROJS.includes(r.projeto));
  const lastAgo = lfeed[0] ? timeAgo(lfeed[0].ts) : "—";
  const fleets: Fleet[] = [
    { code: "LIC", label: "Operação · radar", sub: "radar nacional de licitações", units: ops },
    { code: "INV", label: "Inovação · melhoria contínua", sub: "engenharia · produto · UX · UI", units: inov },
  ];
  const online = ops.length + inov.length;

  return (
    <main className="ccwrap">
      <div className="cc-logout-bar">
        <Link className="cc-back" href="/">← projetos</Link>
        <form action={logout}><button className="cc-logout" type="submit">encerrar sessão · {me.name}</button></form>
      </div>
      <CommandCenter fleets={fleets} tel={telFor(feed, PROJS)} online={online} fails={fails} pending={appr.length} lastAgo={lastAgo} />
      <InsightsPanels ins={ins} />
      <ApprovalsSection approvals={appr} />
    </main>
  );
}
