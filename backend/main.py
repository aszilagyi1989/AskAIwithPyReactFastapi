from fastapi import FastAPI, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import SessionLocal, Chat
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests
import os

GOOGLE_CLIENT_ID = os.environ.get("CLIENT_ID")

app = FastAPI()

app.add_middleware(
  CORSMiddleware,
  allow_origins = ["https://askaiwithpy.onrender.com/"],
  allow_credentials = True,
  allow_methods = ["*"],
  allow_headers = ["*"],
  expose_headers = ["*"]
)

class ChatSchema(BaseModel):
  email: str
  model: str
  question: str
  answer: str

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
  if not authorization or not authorization.startswith("Bearer "):
    raise HTTPException(status_code = 401, detail = "Hiányzó hitelesítés")
    
  token = authorization.split(" ")[1]
  user_data = verify_google_token(token)
    
  # Biztonsági ellenőrzés: Csak a saját emailjével menthet
  if user_data['email'] != chat.email:
    raise HTTPException(status_code = 403, detail = "Emailek nem egyeznek")

  db_chat = Chat(**chat.dict())
  db.add(db_chat)
  db.commit()
  return db_chat


@app.get("/chats/")
def read_chats(db: Session = Depends(get_db)):
  return db.query(Chat).all()
