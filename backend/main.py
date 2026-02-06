from fastapi import FastAPI, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import SessionLocal, Chat
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import os
from openai import OpenAI
import boto3
from botocore.exceptions import NoCredentialsError
from datetime import datetime
from io import BytesIO
import base64
import requests as py_requests


GOOGLE_CLIENT_ID = os.environ.get("CLIENT_ID")
client = OpenAI(api_key = os.getenv("OPENAI_API_KEY"))
s3 = boto3.client(
  's3',
  aws_access_key_id = os.getenv("AWS_ACCESS_KEY_ID"),
  aws_secret_access_key = os.getenv("AWS_SECRET_ACCESS_KEY"),
  region_name = os.getenv("AWS_DEFAULT_REGION")
)


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

class ImageSchema(BaseModel):
  email: str
  model: str
  description: str
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
    idinfo = id_token.verify_oauth2_token(actual_token, google_requests.Request(), GOOGLE_CLIENT_ID)
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
    
    if chat.model != "gpt-5.2":
      degree = 1
    else:
      degree = 0
      
    response = client.chat.completions.create(
      model = chat.model, 
      messages = [{"role": "system", "content": "You are a helpful assistant. Answer as short as possible."}, {"role": "user", "content": chat.question}], 
      temperature = degree
    )
    ai_answer = response.choices[0].message.content
    
    # 2. Mentés az adatbázisba
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


@app.post("/images/")
def create_image(
  image: ImageSchema, 
  db: Session = Depends(get_db), 
  authorization: str = Header(None) # Fejlécből olvassuk a tokent
):
  print(f"DEBUG: Beérkező adat: {image.dict()}")
  if not authorization or not authorization.startswith("Bearer "):
    raise HTTPException(status_code = 401, detail = "Bejelentkezés szükséges")
  
  user_data = verify_google_token(authorization)
    
  # Biztonsági ellenőrzés: Csak a saját emailjével menthet
  if user_data['email'] != image.email:
    raise HTTPException(status_code = 403, detail = "Emailek nem egyeznek")

  try:
    
    response = client.images.generate(
      model = image.model, 
      prompt = image.description
    )
    
    now = datetime.now().strftime('%Y%m%d%H%M%S')
    filename = 'image' + now + '.png'
    
    if image.model == 'dall-e-3':
      link = response.data[0].url
      r = py_requests.get(link)
      image_bytes = BytesIO(r.content)
    else:
      image_base64 = response.data[0].b64_json
      image_bytes = base64.b64decode(image_base64)
      image_bytes = BytesIO(image_bytes)
      
    s3.put_object(
      Bucket = 'askaiwithpy', 
      Key = filename, 
      Body = image_bytes.getvalue()
    )
    
    # 2. Mentés az adatbázisba (az AI válasszal kiegészítve)
    db_image = Image(
      email = image.email,
      model = image.model,
      description = image.description,
      image = f"https://askaiwithpy.s3.eu-north-1.amazonaws.com/{filename}"
    )
    db.add(db_image)
    db.commit()
    db.refresh(db_image)
    return db_image

  except Exception as e:
    print(f"OpenAI hiba: {e}")
    raise HTTPException(status_code = 500, detail = "Hiba az AI válasz generálása közben")
  

@app.get("/chats/")
def read_chats(
    db: Session = Depends(get_db), 
    authorization: str = Header(None)
):
  if not authorization or not authorization.startswith("Bearer "):
    raise HTTPException(status_code = 401, detail = "Bejelentkezés szükséges")
    
  user_data = verify_google_token(authorization)
  user_email = user_data['email'] # Biztonságos e-mail a Google-től

  chats = db.query(Chat).filter(Chat.email == user_email).all()
    
  return chats


@app.get("/images/")
def read_images(
    db: Session = Depends(get_db), 
    authorization: str = Header(None)
):
  if not authorization or not authorization.startswith("Bearer "):
    raise HTTPException(status_code = 401, detail = "Bejelentkezés szükséges")
    
  user_data = verify_google_token(authorization)
  user_email = user_data['email'] # Biztonságos e-mail a Google-től

  images = db.query(Image).filter(Image.email == user_email).all()
    
  return images


@app.get("/")
def home():
    return {"status": "A backend fut!", "endpoint": "/chats/"}
