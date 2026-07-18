import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import LoginForm from "@/components/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const me = await currentUser();
  if (me) redirect("/");
  return <LoginForm />;
}
