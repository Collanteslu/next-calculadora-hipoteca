import { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // Esta ruta está preparada para futura lógica de servidor.
  // Actualmente solo responde con confirmación.
  res.status(200).json({ message: "OK" });
}
