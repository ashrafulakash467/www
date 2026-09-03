import UnifiedAuthPage from "@/Components/auth/UnifiedAuthPage";

export default function LoginPage({ initialRole = "user" }) {
  return <UnifiedAuthPage mode="login" initialRole={initialRole} />;
}
