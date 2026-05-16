import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { LoginPageClient } from "@/components/login/login-page-client";
import { auth } from "@/lib/auth";

export default async function LoginPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/");
  }

  return <LoginPageClient />;
}
