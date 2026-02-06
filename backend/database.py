import os
from sqlalchemy import create_engine, Column, Text, String, Integer, DateTime
from sqlalchemy.sql import func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit = False, autoflush = False, bind = engine)
Base = declarative_base()

class Chat(Base):
  __tablename__ = "chats"
  id = Column(Integer, primary_key = True, index = True)
  email = Column(Text, index = True)
  model = Column(String(30))
  question = Column(Text)
  answer = Column(Text)
  date = Column(DateTime(timezone = True), server_default = func.now()) # created_at jobb lenne date helyett
  
  
class Image(Base):
  __tablename__ = "images"
  id = Column(Integer, primary_key = True, index = True)
  email = Column(Text, index = True)
  model = Column(String(30))
  description = Column(Text)
  image = Column(Text)
  date = Column(DateTime(timezone = True), server_default = func.now()) # created_at jobb lenne date helyett
  
  
class Video(Base):
  __tablename__ = "videos"
  id = Column(Integer, primary_key = True, index = True)
  email = Column(Text, index = True)
  model = Column(String(30))
  content = Column(Text)
  video = Column(Text)
  date = Column(DateTime(timezone = True), server_default = func.now()) # created_at jobb lenne date helyett

Base.metadata.create_all(bind = engine)
