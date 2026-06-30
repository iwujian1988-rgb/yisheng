from fastapi import FastAPI
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.api.routes import router
from app.utils.logger import setup_logging


class ResponseHeaderMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        extra = getattr(request.state, "response_headers", None)
        if isinstance(extra, dict):
            for key, value in extra.items():
                response.headers[key] = value
        return response


def create_app() -> FastAPI:
    setup_logging()
    app = FastAPI(title="Yisheng Agent Service", version="0.1.0")
    app.add_middleware(ResponseHeaderMiddleware)
    app.include_router(router)
    return app


app = create_app()
