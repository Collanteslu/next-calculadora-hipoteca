import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="card-premium p-8 max-w-md w-full text-center space-y-4">
        <h1 className="text-4xl font-bold text-muted-foreground">404</h1>
        <h2 className="text-xl font-semibold">Página no encontrada</h2>
        <p className="text-sm text-muted-foreground">
          La página que buscas no existe o ha sido movida.
        </p>
        <Link href="/" className="btn-primary text-sm inline-block">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
