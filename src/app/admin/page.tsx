"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (!response.ok) {
      setError("Wrong password.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="admin-page">
      <form className="add-form admin-form" onSubmit={onSubmit}>
        <p className="kicker">Admin</p>
        <h1>Mikey only</h1>
        <p className="hint">This unlocks adding, dragging, and editing cards.</p>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoFocus
            required
          />
        </label>
        {error ? <p className="hint">{error}</p> : null}
        <div className="add-actions">
          <button type="submit" disabled={busy}>
            {busy ? "Checking…" : "Log in"}
          </button>
        </div>
      </form>
    </main>
  );
}
