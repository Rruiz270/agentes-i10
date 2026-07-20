import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser, canSeeAgentes, isAdmin } from "@/lib/auth";
import { logout } from "../actions";
import CommandCenter, { type Fleet } from "@/components/command-center";
import ApprovalsSection from "@/components/approvals-section";
import InsightsPanels from "@/components/insights-panels";
import ExecSection from "@/components/exec-section";
import AutoRefresh from "@/components/auto-refresh";
import { loadAll, loadInsights, loadStats, loadExecucao, execAtivo, aplicarAutonomia, licitaUnits, melhoriaUnits, telFor, timeAgo } from "@/lib/fleet-data";

export const dynamic = "force-dynamic";
const PROJS = ["licita360"];

export default async function LicitaPage() {
  const me = await currentUser();
  if (!me) redirect("/login");
  if (!canSeeAgentes(me.role)) redirect("/login");

  const { board, feed, approvals } = await loadAll();
  const ins = await loadInsights("licita360");
  const stats = await loadStats();
  const exec = await loadExecucao("licita360");
  const ops = aplicarAutonomia(licitaUnits(board, approvals), "licita360", stats);
  const inov = aplicarAutonomia(melhoriaUnits("licita360", approvals), "licita360", stats);
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
        <div className="cc-navlinks">
          <Link className="cc-navlink" href="/historico">histórico</Link>
          {isAdmin(me.role) && <Link className="cc-navlink" href="/usuarios">usuários</Link>}
        </div>
        <form action={logout}><button className="cc-logout" type="submit">encerrar sessão · {me.name}</button></form>
      </div>
      <AutoRefresh active={execAtivo(exec)} />
      <CommandCenter fleets={fleets} tel={telFor(feed, PROJS)} online={online} fails={fails} pending={appr.length} lastAgo={lastAgo} />
      <ExecSection items={exec} />
      <InsightsPanels ins={ins} />
      <ApprovalsSection approvals={appr} />
    </main>
  );
}
