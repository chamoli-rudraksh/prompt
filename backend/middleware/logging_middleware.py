import time
import logging
import uuid
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("etnewsai")
logging.basicConfig(level=logging.INFO)


class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        request_id = str(uuid.uuid4())  # NEW 🔥
        start_time = time.time()

        try:
            response = await call_next(request)
        except Exception as e:
            logger.error(f"[{request_id}] ERROR: {str(e)}")
            raise e

        process_time = time.time() - start_time

        logger.info(
            {
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status": response.status_code,
                "time": round(process_time, 4),
            }
        )

        return response