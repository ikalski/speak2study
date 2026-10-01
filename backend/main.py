import os
import json
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

app = FastAPI(title="Speak2Study API")

# Enable CORS for frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define forced schema for Gemini
class Flashcard(BaseModel):
    question: str = Field(description="Concise study question based on audio")
    answer: str = Field(description="Accurate answer based on audio")

class FlashcardDeck(BaseModel):
    cards: list[Flashcard]

# Initialize Gemini Client
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise RuntimeError("GEMINI_API_KEY is not set")

client = genai.Client(api_key=api_key)

@app.get("/")
def health_check():
    return {"status": "ok", "service": "Speak2Study API"}

@app.post("/api/generate")
async def generate_flashcards(file: UploadFile = File(...)):
    try:
        audio_bytes = await file.read()
        
        # Native Multimodal Audio directly to Gemini
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[
                types.Part.from_bytes(
                    data=audio_bytes,
                    mime_type=file.content_type or 'audio/wav',
                ),
                "Extract key study concepts from this audio and format them into flashcard Q&A pairs."
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=FlashcardDeck,
                system_instruction="You are an expert tutor. Create accurate flashcards from voice notes."
            )
        )
        
        result = json.loads(response.text)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))