import express, { Request, Response } from 'express';

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req: Request, res: Response) => {
  res.json({
    "title": "Webhook senden",
    "properties": [],
    "actions": [
      {
        "type": "ACTION_HOOK",
        "text": "Los geht's!",
        "tooltip": "Sendet einen Webhook mit Deal-Daten",
        "confirmationMessage": "Willst du das wirklich tun?",
        "actionHook": "https://hooks.zapier.com/hooks/catch/xyz"
      }
    ]
  });
});

// Starten Sie den Server nur, wenn Sie nicht auf Vercel sind
// Vercel kümmert sich um das Starten des Servers für uns
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}

export default app; 