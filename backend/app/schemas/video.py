from pydantic import BaseModel, Field


class Video(BaseModel):
    id: str
    title: str
    instructor: str
    duration: str
    level: str
    summary: str
    thumbnailUrl: str
    embedUrl: str
    tags: list[str] = Field(default_factory=list)
