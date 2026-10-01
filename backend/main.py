import os
import json
import tempfile
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from google import genai
from google.genai import types

app = FastAPI(title="Speak2Study 2.0 Engine")

# Crucial for cross-origin requests from Vercel to Render
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Define Strict Pydantic Output Schemas (Forces Gemini to format output)
class Flashcard(BaseModel):
    id: str = Field(description="Unique short ID for the card, e.g., card_1")
    question: str = Field(description="A clear, testable question based on the audio clip.")
    answer: str = Field(description="A concise, accurate answer explaining the concept.")
    category: str = Field(description="Subject domain or category tag (e.g., Definitions, Formulas, Key Concepts).")

class FlashcardDeck(BaseModel):
    topic: str = Field(description="Main subject summary extracted from the audio.")
    cards: list[Flashcard]

@app.get("/")
def health_check():
    return {"status": "online", "system": "Speak2Study 2.0 Core"}

@app.post("/api/process-audio", response_model=FlashcardDeck)
async def process_audio(file: UploadFile = File(...)):
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is missing in backend environment variables.")

    client = genai.Client(api_key=GEMINI_API_KEY)

    # Save uploaded browser audio file to temporary storage
    ext = os.path.splitext(file.filename)[1] or ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as temp_audio:
        temp_audio.write(await file.read())
        temp_path = temp_audio.name

    try:
        # 2. Native Multimodal Audio Upload to Gemini
        remote_file = client.files.upload(
            file=temp_path,
            config=types.UploadFileConfig(
                mime_type=file.content_type or "audio/webm",
                display_name="study_session_audio"
            )
        )

        prompt = (
            "You are an elite academic tutor. Analyze this audio recording of a student studying or listening to a lecture. "
            "Extract the most important core ideas and build an effective, study-ready deck of flashcards."
        )

        # 3. Request Structured JSON Output directly from Gemini
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[remote_file, prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=FlashcardDeck,
                temperature=0.2, # Low temperature for accurate factual extractions
            ),
        )

        # Clean up audio file from Gemini remote storage
        try:
            client.files.delete(name=remote_file.name)
        except Exception:
            pass

        # Return validated JSON payload
        parsed_data = json.loads(response.text)
        return parsed_data

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini Audio Processing Error: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)