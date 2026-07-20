"use client";
import { useActionState } from "react";
import { createUserAction, type UserFormState } from "@/app/actions";

export default function UserForm() {
  const [state, action, pending] = useActionState<UserFormState, FormData>(createUserAction, undefined);
  return (
    <form action={action} className="usr-form">
      <input className="usr-in" name="name" placeholder="Nome" required />
      <input className="usr-in" name="email" type="email" placeholder="e-mail" required />
      <select className="usr-in" name="agentes_role" defaultValue="aprovador">
        <option value="aprovador">Aprovador</option>
        <option value="visualizador">Visualizador</option>
        <option value="admin">Admin</option>
      </select>
      <input className="usr-in" name="password" type="text" placeholder="senha (deixe vazio se já existe)" />
      <button className="usr-add" type="submit" disabled={pending}>{pending ? "salvando…" : "+ adicionar"}</button>
      {state?.error && <div className="usr-msg err">{state.error}</div>}
      {state?.ok && <div className="usr-msg ok">{state.ok}</div>}
    </form>
  );
}
