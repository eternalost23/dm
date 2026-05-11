from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.api.dependencies import get_current_user
from app.models import User

router = APIRouter(
    prefix="/uploads",
    tags=["Uploads"],
)

UPLOAD_DIR = Path("public/uploads")
MAX_UPLOAD_SIZE = 8 * 1024 * 1024
ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "video/mp4",
    "application/pdf",
    "text/plain",
}


@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: UploadFile = File(...),
    _: User = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type",
        )

    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File is too large",
        )

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    extension = Path(file.filename or "").suffix.lower()
    filename = f"{uuid4().hex}{extension}"
    path = UPLOAD_DIR / filename
    path.write_bytes(content)

    return {
        "url": f"/static/uploads/{filename}",
        "content_type": file.content_type,
        "filename": file.filename,
    }
