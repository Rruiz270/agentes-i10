import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser, isAdmin, listAgentesUsers, ROLE_LABEL } from "@/lib/auth";
import { logout, changeRoleAction } from "../actions";
import UserForm from "@/components/user-form";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const me = await currentUser();
  if (!me) redirect("/login");
  if (!isAdmin(me.role)) redirect("/"); // só Admin gerencia usuários
  const users = await listAgentesUsers();

  return (
    <main className="ccwrap">
      <div className="cc-logout-bar">
        <Link className="cc-back" href="/">← projetos</Link>
        <div className="cc-navlinks">
          <Link className="cc-navlink" href="/juri">júri</Link>
          <Link className="cc-navlink" href="/historico">histórico</Link>
          <Link className="cc-navlink" href="/usuarios">usuários</Link>
        </div>
        <form action={logout}><button className="cc-logout" type="submit">encerrar sessão · {me.name}</button></form>
      </div>

      <section className="hist">
        <h2 className="ap-h2"><span className="ap-h2-glow" />USUÁRIOS · quem acessa e o que pode</h2>

        <div className="usr-legend">
          <span><b>Admin</b> — tudo (aprova, deploya, envia WhatsApp, gerencia usuários)</span>
          <span><b>Aprovador</b> — vê tudo e aprova internos (não deploya nem envia externo)</span>
          <span><b>Visualizador</b> — só acompanha</span>
        </div>

        <UserForm />

        <div className="hist-wrap" style={{ marginTop: 18 }}>
          <table className="hist-table">
            <thead><tr><th>Nome</th><th>E-mail</th><th>Papel</th><th>Alterar</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="hist-item">{u.name}{String(u.id) === me.sub && <span className="usr-you"> (você)</span>}</td>
                  <td className="hist-by">{u.email}</td>
                  <td><span className={`usr-role r-${u.agentes_role}`}>{ROLE_LABEL[u.agentes_role] ?? u.agentes_role}</span></td>
                  <td>
                    {String(u.id) === me.sub ? <span className="hist-out dim">—</span> : (
                      <form action={changeRoleAction} className="usr-rowform">
                        <input type="hidden" name="id" value={u.id} />
                        <select className="usr-in sm" name="agentes_role" defaultValue={u.agentes_role}>
                          <option value="admin">Admin</option>
                          <option value="aprovador">Aprovador</option>
                          <option value="visualizador">Visualizador</option>
                          <option value="revogar">✕ Revogar acesso</option>
                        </select>
                        <button className="usr-apply" type="submit">aplicar</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
