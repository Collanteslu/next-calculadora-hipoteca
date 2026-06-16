"use client";

import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="card-premium p-8 max-w-md w-full text-center space-y-4">
        <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
          <span className="text-destructive text-xl font-bold">!</span>
        </div>
        <h1 className="text-xl font-semibold">Algo salió mal</h1>
        <p className="text-sm text-muted-foreground">
          Hubo un error al procesar la solicitud. Intenta de nuevo.
        </p>
        <button onClick={reset} type="button" className="btn-primary text-sm">
          Intentar de nuevo
        </button>
      </div>
    </div>
  );
}
