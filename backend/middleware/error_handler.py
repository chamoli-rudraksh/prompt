from fastapi import Request
from fastapi.responses import JSONResponse
import logging
import uuid

logger = logging.getLogger("etnewsai")

async def global_exception_handler(request: Request, exc: Exception):
    request_id = str(uuid.uuid4())

    logger.error(
        f"Error occurred | request_id={request_id} | path={request.url.path} | error={str(exc)}"
    )

    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "request_id": request_id,
            "message": str(exc)
        }
    )