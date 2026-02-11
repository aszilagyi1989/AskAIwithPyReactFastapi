from database import SessionLocal, Chat, Image, Video
from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import os
from openai import OpenAI
import boto3
from botocore.exceptions import NoCredentialsError
from datetime import date, datetime, timedelta
from typing import Optional
from io import BytesIO
import base64
import requests as py_requests
import httpx


GOOGLE_CLIENT_ID = os.environ.get("CLIENT_ID")
RECAPTCHA_SECRET_KEY = os.getenv("RECAPTCHA_SECRET_KEY")

async def verify_recaptcha(token: str):
    url = "https://www.google.com/recaptcha/api/siteverify"
    # A RECAPTCHA_SECRET_KEY-t a Google Admin Console-ból (Secret Key) kell venni!
    data = {
        "secret": RECAPTCHA_SECRET_KEY,
        "response": token
    }
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, data=data)
            result = response.json()
            # Logoljuk a hibát, ha van, hogy lásd a Render logban
            if not result.get("success"):
                print(f"reCAPTCHA hiba: {result.get('error-codes')}")
            return result.get("success", False)
        except Exception as e:
            print(f"Hálózati hiba a reCAPTCHA ellenőrzésekor: {e}")
            return False

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
  openaiapi_key: str

class ImageSchema(BaseModel):
  email: str
  model: str
  description: str
  openaiapi_key: str
  
class VideoSchema(BaseModel):
  email: str
  model: str
  duration: str
  content: str
  openaiapi_key: str

class LoginSchema(BaseModel):
  google_token: str
  recaptcha_token: str


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


@app.post("/verify-login")
async def verify_login(data: LoginSchema):
    print("DEBUG: Verify login hívás érkezett!")
    # 1. reCAPTCHA ellenőrzése
    is_human = await verify_recaptcha(data.recaptcha_token)
    if not is_human:
        raise HTTPException(status_code = 400, detail = "reCAPTCHA ellenőrzés sikertelen")

    # 2. Google Token ellenőrzése
    try:
        # A verify_google_token függvényedet használjuk
        user_data = verify_google_token(data.google_token)
        
        # Ha ide eljut, minden rendben van
        return {
            "success": True, 
            "message": "Sikeres ellenőrzés",
            "user": {
                "email": user_data.get("email"),
                "name": user_data.get("name")
            }
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Érvénytelen Google token: {str(e)}")
      
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

    user_client = OpenAI(api_key = chat.openaiapi_key)
      
    response = user_client.chat.completions.create(
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
    
    user_client = OpenAI(api_key = image.openaiapi_key)

    response = user_client.images.generate(
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
      Key = f"{image.email}/{filename}", 
      # GrantRead = f'emailAddress="{image.email}"',
      Body = image_bytes.getvalue()
    )
    
    # 2. Mentés az adatbázisba (az AI válasszal kiegészítve)
    db_image = Image(
      email = image.email,
      model = image.model,
      description = image.description,
      image = f"https://askaiwithpy.s3.eu-north-1.amazonaws.com/{image.email}/{filename}"
    )
    db.add(db_image)
    db.commit()
    db.refresh(db_image)
    return db_image

  except Exception as e:
    print(f"OpenAI hiba: {e}")
    raise HTTPException(status_code = 500, detail = "Hiba az AI válasz generálása közben")


@app.post("/videos/")
def create_videos(
  video: VideoSchema, 
  db: Session = Depends(get_db), 
  authorization: str = Header(None) # Fejlécből olvassuk a tokent
):
  print(f"DEBUG: Beérkező adat: {video.dict()}")
  if not authorization or not authorization.startswith("Bearer "):
    raise HTTPException(status_code = 401, detail = "Bejelentkezés szükséges")
  
  user_data = verify_google_token(authorization)
    
  # Biztonsági ellenőrzés: Csak a saját emailjével menthet
  if user_data['email'] != video.email:
    raise HTTPException(status_code = 403, detail = "Emailek nem egyeznek")

  try:

    user_client = OpenAI(api_key = video.openaiapi_key)

    response = user_client.videos.create(
      model = video.model,
      prompt = video.content,
      size = "1280x720",
      seconds = video.duration
    )
  
    completed_video = user_client.videos.retrieve(response.id)
    print(completed_video)
    while completed_video.status != "completed":
      completed_video = user_client.videos.retrieve(response.id)
      if completed_video.status == "failed":
        print(f"This video can not be created: {completed_video}")
        break
      
    if completed_video.status == "completed":
      print(f"You can download this video: {response.id}.mp4")
      video_content = user_client.videos.download_content(completed_video.id)
      video_bytes = video_content.read()

    s3.put_object(
      Bucket = 'askaiwithpy',
      Key = f"{video.email}/{response.id}",
      Body = video_bytes,
      ContentType = 'video/mp4'
    )
  
    # 2. Mentés az adatbázisba (az AI válasszal kiegészítve)
    db_video = Video(
      email = video.email,
      model = video.model,
      content = video.content,
      video = f"https://askaiwithpy.s3.eu-north-1.amazonaws.com/{video.email}/{response.id}"
    )
    db.add(db_video)
    db.commit()
    db.refresh(db_video)
    
    return db_video

  except Exception as e:
    print(f"OpenAI hiba: {e}")
    raise HTTPException(status_code = 500, detail = "Hiba az AI válasz generálása közben")
  

@app.get("/chats/")
def read_chats(
    db: Session = Depends(get_db), 
    authorization: str = Header(None),
    openaiapi_key: str = None,
    start_date: Optional[date] = None, 
    end_date: Optional[date] = None
):
  if not authorization or not authorization.startswith("Bearer "):
    raise HTTPException(status_code = 401, detail = "Bejelentkezés szükséges")
    
  user_data = verify_google_token(authorization)
  user_email = user_data['email'] # Biztonságos e-mail a Google-től

  query = db.query(Chat).filter(Chat.email == user_email)

  if start_date:
    query = query.filter(Chat.date >= start_date)
  if end_date:
    query = query.filter(Chat.date < end_date + timedelta(days = 1))  
  
  return query.order_by(Chat.date.desc()).all()


@app.get("/images/")
def read_images(
    db: Session = Depends(get_db), 
    authorization: str = Header(None),
    openaiapi_key: str = None,
    start_date: Optional[date] = None, 
    end_date: Optional[date] = None
):
  if not authorization or not authorization.startswith("Bearer "):
    raise HTTPException(status_code = 401, detail = "Bejelentkezés szükséges")
    
  user_data = verify_google_token(authorization)
  user_email = user_data['email'] # Biztonságos e-mail a Google-től

  query = db.query(Image).filter(Image.email == user_email)

  if start_date:
    query = query.filter(Image.date >= start_date)
  if end_date:
    query = query.filter(Image.date < end_date + timedelta(days = 1))  
  
  return query.order_by(Image.date.desc()).all()



@app.get("/videos/")
def read_videos(
    db: Session = Depends(get_db), 
    authorization: str = Header(None),
    openaiapi_key: str = None,
    start_date: Optional[date] = None, 
    end_date: Optional[date] = None
):
  if not authorization or not authorization.startswith("Bearer "):
    raise HTTPException(status_code = 401, detail = "Bejelentkezés szükséges")
    
  user_data = verify_google_token(authorization)
  user_email = user_data['email'] # Biztonságos e-mail a Google-től
  
  query = db.query(Video).filter(Video.email == user_email)

  if start_date:
    query = query.filter(Video.date >= start_date)
  if end_date:
    query = query.filter(Video.date < end_date + timedelta(days = 1))  
  
  return query.order_by(Video.date.desc()).all()


@app.get("/")
def home():
    return {"status": "A backend fut!", "endpoint": "/chats/"}
