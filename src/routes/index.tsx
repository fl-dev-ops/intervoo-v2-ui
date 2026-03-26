import { createFileRoute } from "@tanstack/react-router";
import { authClient } from "#/lib/auth-client";
import { getSession } from "#/lib/auth.functions";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const session = await getSession();
    return { session };
  },
  component: HomePage,
});

function HomePage() {
  const { session } = Route.useRouteContext();

  return (
    <main style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Pre-Screen Platform</h1>

      {session?.user ? (
        <div>
          <p>Welcome, {session.user.name || session.user.email}</p>
          <button
            onClick={() => authClient.signOut().then(() => window.location.reload())}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1rem",
              cursor: "pointer",
              backgroundColor: "#333",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              fontSize: "1rem",
            }}
          >
            Sign Out
          </button>
        </div>
      ) : (
        <div>
          <p>Please log in or register to continue.</p>
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
            <a
              href="/pre-screen"
              style={{
                display: "inline-block",
                padding: "0.75rem 1.5rem",
                backgroundColor: "#111827",
                color: "#fff",
                textDecoration: "none",
                borderRadius: "999px",
              }}
            >
              Open Pre-Screen
            </a>
            <a
              href="/login"
              style={{
                display: "inline-block",
                padding: "0.75rem 1.5rem",
                backgroundColor: "#333",
                color: "#fff",
                textDecoration: "none",
                borderRadius: "4px",
              }}
            >
              Login
            </a>
            <a
              href="/register"
              style={{
                display: "inline-block",
                padding: "0.75rem 1.5rem",
                border: "1px solid #333",
                color: "#333",
                textDecoration: "none",
                borderRadius: "4px",
              }}
            >
              Register
            </a>
          </div>
        </div>
      )}
    </main>
  );
}
