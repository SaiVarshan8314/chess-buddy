import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Lichess OAuth Token Exchange
  app.post("/api/auth/lichess/token", async (req, res) => {
    const { code, code_verifier, redirect_uri } = req.body;
    
    try {
      const response = await axios.post("https://lichess.org/api/token", {
        grant_type: "authorization_code",
        code,
        code_verifier,
        redirect_uri,
        client_id: process.env.VITE_LICHESS_CLIENT_ID,
      }, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      });
      
      res.json(response.data);
    } catch (error: any) {
      console.error("Lichess Token Error:", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to exchange token" });
    }
  });

  // Send Lichess Message
  app.post("/api/lichess/send-message", async (req, res) => {
    const { username, text, token } = req.body;
    
    try {
      const response = await axios.post(`https://lichess.org/api/msg/${username}`, 
        `text=${encodeURIComponent(text)}`,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/x-www-form-urlencoded"
          }
        }
      );
      
      res.json({ success: true, data: response.data });
    } catch (error: any) {
      console.error("Lichess Message Error:", error.response?.data || error.message);
      res.status(error.response?.status || 500).json({ error: error.response?.data || "Failed to send message" });
    }
  });

  // Lichess OAuth Callback Handler
  app.get("/auth/lichess/callback", async (req, res) => {
    res.send(`
      <html>
        <head>
          <title>Lichess Auth Success</title>
          <style>
            body { background: #0a0a0a; color: #f5f5f5; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #0f0f0f; padding: 2rem; border-radius: 20px; border: 1px solid rgba(255,255,255,0.05); text-align: center; }
            .spinner { border: 3px solid rgba(255,255,255,0.1); border-top: 3px solid #f97316; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 0 auto 1rem; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="spinner"></div>
            <p>Authenticating with Lichess...</p>
          </div>
          <script>
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const code_verifier = localStorage.getItem('lichess_verifier');
            const redirect_uri = window.location.origin + window.location.pathname;

            if (code && code_verifier) {
              fetch('/api/auth/lichess/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, code_verifier, redirect_uri })
              })
              .then(res => res.json())
              .then(data => {
                if (data.access_token) {
                  window.opener.postMessage({ type: 'LICHESS_AUTH_SUCCESS', token: data.access_token }, '*');
                  window.close();
                } else {
                  document.body.innerHTML = '<p>Error: ' + JSON.stringify(data) + '</p>';
                }
              })
              .catch(err => {
                document.body.innerHTML = '<p>Network error occurred during token exchange.</p>';
              });
            } else {
              document.body.innerHTML = '<p>Authorization code or verifier missing.</p>';
            }
          </script>
        </body>
      </html>
    `);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
