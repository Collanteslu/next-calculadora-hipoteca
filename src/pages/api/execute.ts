import { NextApiRequest, NextApiResponse } from "next";

const ALLOWED_METHODS = ["POST"] as const;

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!ALLOWED_METHODS.includes(req.method as (typeof ALLOWED_METHODS)[number])) {
    res.setHeader("Allow", ALLOWED_METHODS);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Esta ruta está preparada para futura lógica de servidor.
  // Actualmente solo responde con confirmación.
  res.status(200).json({ message: "OK" });
}
