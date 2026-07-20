import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser, canSeeAgentes } from "@/lib/auth";
import { logout } from "../actions";
import CommandCenter, { type Fleet } from "@/components/command-center";
import ApprovalsSection from "@/components/approvals-section";
import ExecSection from "@/components/exec-section";
import AutoRefresh from "@/components/auto-refresh";
import { loadAll, loadStats, loadExecucao, execAtivo, aplicarAutonomia, crmUnits, melhoriaUnits, telFor, timeAgo } from "@/lib/fleet-data";

export const dynamic = "force-dynamic";
const PROJS = ["crm", "crm-marketing", "hq-supervisor"];

export default async function CrmPage() {
  const me = await currentUser();
  if (!me) redirect("/login");
  if (!canSeeAgentes(me.role)) redirect("/login");

  const { board, feed, approvals } = await loadAll();
  const stats = await loadStats();
  const exec = await loadExecucao("crm");
  const ops = aplicarAutonomia(crmUnits(board, approvals), "crm", stats);
  const inov = aplicarAutonomia(melhoriaUnits("crm", approvals), "crm", stats);
  const appr = approvals.filter((a) => a.projeto === "crm");
  const fails = board.filter((b) => PROJS.includes(b.projeto) && b.status === "FAIL").length;
  const cfeed = feed.filter((r) => PROJS.includes(r.projeto));
  const lastAgo = cfeed[0] ? timeAgo(cfeed[0].ts) : "—";
  const fleets: Fleet[] = [
    { code: "OPS", label: "Operação", sub: "captação · funil · marketing", units: ops },
    { code: "INV", label: "Inovação · melhoria contínua", sub: "engenharia · produto · UX · UI", units: inov },
  ];
  const online = ops.length + inov.length;

  return (
    <main className="ccwrap">
      <div className="cc-logout-bar">
        <Link className="cc-back" href="/">← projetos</Link>
        <form action={logout}><button className="cc-logout" type="submit">encerrar sessão · {me.name}</button></form>
      </div>
      <AutoRefresh active={execAtivo(exec)} />
      <CommandCenter fleets={fleets} tel={telFor(feed, PROJS)} online={online} fails={fails} pending={appr.length} lastAgo={lastAgo} />
      <ExecSection items={exec} />
      <ApprovalsSection approvals={appr} />
    </main>
  );
}
