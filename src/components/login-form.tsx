"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/actions";

export default function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    login,
    undefined
  );
  return (
    <div className="loginwrap">
      <form className="loginbox" action={action}>
        <div className="logo">
          <i>i</i>
          <b>10</b>
        </div>
        <h1>Central de Agentes</h1>
        <p>Acesso restrito. Entre com sua conta.</p>
        <input name="email" type="email" placeholder="E-mail" autoComplete="username" required />
        <input name="password" type="password" placeholder="Senha" autoComplete="current-password" required />
        <button type="submit" disabled={pending}>
          {pending ? "Entrando…" : "Entrar"}
        </button>
        <div className="err">{state?.error ?? ""}</div>
      </form>
    </div>
  );
}
