const express  = require("express")
const cors     = require("cors")
const fetch    = require("node-fetch")
const app      = express()

app.use(cors())
app.use(express.json())

// ── CONFIG ──
const GROQ_KEY    = "process.env.GROQ_KEY"
const EL_KEY      = "process.env.EL_KEY"
const EL_VOICE_ID = "fQmr8dTaOQq116mo2X7F"

const SYSTEM = `Sei VEGA, l'assistente personale di Nicholas Pelizzaro.
Sei preciso, tecnico, diretto. Rispondi sempre in italiano.
Max 2-3 frasi. Niente fronzoli.
Nicholas è tiratore PRS rimfire, tecnico elettrauto flotte, founder Shooting Labs.
Setup: Bergara B14, Discovery XED 6-36x56, zero 50m, Lapua SLR.`

// ── ROUTE PRINCIPALE ──
app.post("/vega", async (req, res) => {
  const { command } = req.body
  if (!command) return res.status(400).json({ error: "command mancante" })

  console.log("VEGA riceve:", command)

  try {
    // 1. Chiama Groq per la risposta testo
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system",  content: SYSTEM  },
          { role: "user",    content: command }
        ],
        max_tokens: 150,
        temperature: 0.7
      })
    })
    const groqData = await groqRes.json()
    const text = groqData.choices?.[0]?.message?.content || "Comando ricevuto."
    console.log("VEGA risponde:", text)

    // 2. Chiama ElevenLabs per audio Samanta
    const elRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${EL_VOICE_ID}`, {
      method: "POST",
      headers: {
        "xi-api-key":   EL_KEY,
        "Content-Type": "application/json",
        "Accept":       "audio/mpeg"
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.55, similarity_boost: 0.88, style: 0.25 }
      })
    })

    if (!elRes.ok) {
      // Se ElevenLabs fallisce, ritorna solo il testo
      return res.json({ text, audio: null })
    }

    const audioBuffer = await elRes.buffer()
    const audioBase64 = audioBuffer.toString("base64")

    res.json({ text, audio: audioBase64 })

  } catch (err) {
    console.error("Errore:", err)
    res.status(500).json({ error: err.message })
  }
})

// ── HEALTH CHECK ──
app.get("/", (req, res) => res.json({ status: "VEGA online" }))

app.listen(3000, () => console.log("VEGA server attivo su porta 3000"))
