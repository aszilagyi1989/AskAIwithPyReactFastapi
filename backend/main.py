from fastapi import FastAPI, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import SessionLocal, Chat
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests
import os
from openai import OpenAI

GOOGLE_CLIENT_ID = os.environ.get("CLIENT_ID")
client = OpenAI(api_key = os.getenv("OPENAI_API_KEY"))

app = FastAPI()

app.add_middleware(
  CORSMiddleware,
  allow_origins = ["https://askaiwithpy.onrender.com"],
  allow_credentials = True,
  allow_methods = ["*"],
  allow_headers = ["*"],
  expose_headers = ["*"]
)

class ChatSchema(BaseModel):
  email: str
  model: str
  question: str
  # answer: str

def get_db():
  db = SessionLocal()
  try: 
    yield db
  finally: 
    db.close()

def verify_google_token(token: str):
  try:
    actual_token = token.replace("Bearer ", "")
    idinfo = id_token.verify_oauth2_token(actual_token, requests.Request(), GOOGLE_CLIENT_ID)
    return idinfo
  except Exception as e:
    print(f"Token hiba: {str(e)}") # Ez megjelenik a Render logban!
    raise HTTPException(status_code = 401, detail = f"Token hiba: {str(e)}")
      
      
@app.post("/chats/")
def create_chat(
  chat: ChatSchema, 
  db: Session = Depends(get_db), 
  authorization: str = Header(None) # Fejlécből olvassuk a tokent
):
  print(f"DEBUG: Beérkező adat: {chat.dict()}")
  if not authorization or not authorization.startswith("Bearer "):
    raise HTTPException(status_code = 401, detail = "Bejelentkezés szükséges")
  
  user_data = verify_google_token(authorization)
    
  # Biztonsági ellenőrzés: Csak a saját emailjével menthet
  if user_data['email'] != chat.email:
    raise HTTPException(status_code = 403, detail = "Emailek nem egyeznek")

  try:
    # 1. AI Válasz generálása
    response = client.chat.completions.create(
      model = chat.model, 
      messages = [{"role": "system", "content": "You are a helpful assistant. Answer as short as possible."}, {"role": "user", "content": chat.question}], 
      temperature = 0
    )
    ai_answer = response.choices[0].message.content
    
    # 2. Mentés az adatbázisba (az AI válasszal kiegészítve)
    db_chat = Chat(
      email = chat.email,
      model = chat.model,
      question = chat.question,
      answer = ai_answer
    )
    db.add(db_chat)
    db.commit()
    db.refresh(db_chat)
    return db_chat

  except Exception as e:
    print(f"OpenAI hiba: {e}")
    raise HTTPException(status_code = 500, detail = "Hiba az AI válasz generálása közben")


@app.get("/chats/")
def read_chats(db: Session = Depends(get_db)):
  return db.query(Chat).all()

@app.get("/")
def home():
    return {"status": "A backend fut!", "endpoint": "/chats/"}
