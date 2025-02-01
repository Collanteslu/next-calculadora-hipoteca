import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check if the request method is POST
  if (req.method === 'POST') {
    // Here you can use child_process or any other server-side logic
    // Example: const { exec } = require('child_process');

    // Execute your logic and send a response
    res.status(200).json({ message: 'Server-side logic executed successfully' });
  } else {
    // Handle any other HTTP method
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
