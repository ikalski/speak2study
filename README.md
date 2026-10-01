# speak2study
this is an website which helps you to make flash cards 
when you are reading your notes you can use this to record yourself when reading and after you have completed 
it will generate flashcards about the topics which you had stated 
This will help you in your studies by doing active recall of what you read which will make it easier to rememeber and learn information
#ARCHITECTURE FLOW 
[User Mic] 
   │ (Raw Audio Blob via WebRTC)
   ▼
[Next.js Frontend (Vercel)] 
   │ (POST /api/process-audio)
   ▼
[FastAPI Backend (Render)] 
   │ (Uploads raw audio directly)
   ▼
[Gemini 2.5/3.8 Flash API] ──(Structured Output Config)──► [Returns Strict JSON]
   │
   ▼
[FastAPI parses JSON & returns to Next.js]
   │
   ▼
[3D Interactive Flip-Cards UI (with human-in-the-loop edit mode)]
