"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function RegisterForm() {
  const router = useRouter();

  // Obligatorios
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Opcionales
  const [birthdate, setBirthDate] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      const body: Record<string, string> = {
        username,
        display_name: displayName,
        email,
        password,
      };
      if (birthdate)    body.birthdate   = birthdate;
      if (bio)  body.bio  = bio;
      if (phone)        body.phone        = phone;

      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          Array.isArray(data.message) ? data.message.join(", ") : data.message || "Error al registrarse."
        );
      }

      router.push("/login");
    } catch (err: any) {
      setError(err.message || "Error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#65558F] border-[#65558F] placeholder-[#65558F]/50 text-[#65558F]";

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 py-10">
      <form
        onSubmit={onSubmit}
        className="bg-white shadow-2xl rounded-2xl p-8 w-full max-w-md flex flex-col gap-5"
      >
        {/* Logo */}
        <div className="flex justify-center">
          <div
            className="rounded-full flex items-center justify-center"
            
          >
            <Image
              src="/logo-bandlink.png"
              alt="BandLink logo"
              width={250}
              height={250}
              priority
              className="object-contain"
            />
          </div>
        </div>

        <h2 className="text-3xl font-bold text-center" style={{ color: "#65558F" }}>
          Crear cuenta
        </h2>

        {/* ── Obligatorios ── */}
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Nombre de usuario (ej: juan123)"
          type="text"
          className={inputClass}
          required
          minLength={3}
          maxLength={30}
        />

        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Nombre para mostrar (ej: Juan García)"
          type="text"
          className={inputClass}
          required
          minLength={1}
          maxLength={80}
        />

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          type="email"
          className={inputClass}
          required
        />

        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          type="password"
          className={inputClass}
          required
          minLength={6}
        />

        <input
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirmar contraseña"
          type="password"
          className={inputClass}
          required
          minLength={6}
        />

        {/* ── Opcionales ── */}
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#65558F" }}>
          Opcional
        </p>

        <div className="flex flex-col gap-1">
          <label className="text-xs" style={{ color: "#65558F" }}>
            Fecha de nacimiento
          </label>
          <input
            value={birthdate}
            onChange={(e) => setBirthDate(e.target.value)}
            type="date"
            className={inputClass}
          />
        </div>

        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Biografía (cuéntanos algo sobre vos)"
          rows={3}
          className={`${inputClass} resize-none`}
          maxLength={300}
        />

        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Teléfono"
          type="tel"
          className={inputClass}
        />

        <button
          disabled={loading}
          className="w-full py-3 rounded-full font-semibold transition-colors duration-200 disabled:opacity-50 text-white hover:brightness-95 active:scale-[0.99]"
          style={{ backgroundColor: "#65558F" }}
        >
          {loading ? "Registrando…" : "Crear cuenta"}
        </button>

        {error && (
          <p className="text-red-600 text-sm text-center">{"Error al crear la cuenta"}</p>
        )}

        <p className="text-center text-sm" style={{ color: "#65558F" }}>
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="font-semibold underline" style={{ color: "#65558F" }}>
            Iniciá sesión
          </Link>
        </p>
      </form>
    </div>
  );
}
