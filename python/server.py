import argparse
import asyncio
import json
import logging
import os
import ssl

from aiohttp import web
from aiortc.contrib.media import MediaPlayer, MediaRecorder
import aiohttp_cors

from rtcconn import RTCConnectionHandler
from stream_handle import StreamHandler
from websocket import websocket_handler

ROOT = os.path.dirname(__file__)

logger = logging.getLogger("pc")
pcs = set()

def set_cors(my_app, offer_route):
    cors = aiohttp_cors.setup(my_app)
    cors.add(offer_route, {
        "*": aiohttp_cors.ResourceOptions(
            allow_credentials=True,
            expose_headers=("X-Custom-Server-Header",),
            allow_headers=("X-Requested-With", "Content-Type"),
            max_age=3600,
        )
    })

async def index(request):
    content = open(os.path.join(ROOT, "index.html"), "r").read()
    return web.Response(content_type="text/html", text=content)


async def javascript(request):
    content = open(os.path.join(ROOT, "client.js"), "r").read()
    return web.Response(content_type="application/javascript", text=content)


async def offer(request):
    params = await request.json()
    rtc = RTCConnectionHandler()
    stream = StreamHandler(rtc)
    pcs.add(stream)
    player = MediaPlayer(os.path.join(ROOT, "demo-instruct.wav"))
    file = os.path.join(ROOT, "video.mp4")
    print(file)
    recorder = MediaRecorder(file)
    # recorder = MediaBlackhole()
    stream.set_media_player(player)
    stream.set_media_recorder(recorder)
    answer = await stream.start(params)

    return web.Response(
        content_type="application/json",
        text=json.dumps(
            {"sdp": answer.sdp, "type": answer.type}
        ),
    )


async def on_shutdown(app):
    # close peer connections
    coros = [pc.close() for pc in pcs]
    await asyncio.gather(*coros)
    pcs.clear()


def setup_webserver(params):
    app = web.Application()
    app.on_shutdown.append(on_shutdown)
    app.router.add_static('/', path=os.path.join(ROOT, '../public'), name='public')

    root_route = app.router.add_get("/example", index)
    app.router.add_get("/ws", websocket_handler)
    app.router.add_get("/client.js", javascript)
    app.router.add_post("/offer", offer)
    set_cors(app, root_route)
    web.run_app(
        app, access_log=None, host=params.host, port=params.port, ssl_context=ssl_context
    )


def handle_args():
    global args, ssl_context
    parser = argparse.ArgumentParser(
        description="WebRTC audio / video / data-channels demo"
    )
    parser.add_argument("--cert-file", help="SSL certificate file (for HTTPS)")
    parser.add_argument("--key-file", help="SSL key file (for HTTPS)")
    parser.add_argument(
        "--host", default="0.0.0.0", help="Host for HTTP server (default: 0.0.0.0)"
    )
    parser.add_argument(
        "--port", type=int, default=8881, help="Port for HTTP server (default: 8881)"
    )
    parser.add_argument("--record-to", help="Write received media to a file.")
    parser.add_argument("--verbose", "-v", action="count")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO)
    if args.cert_file:
        ssl_context = ssl.SSLContext()
        ssl_context.load_cert_chain(args.cert_file, args.key_file)
    else:
        ssl_context = None
    return args

if __name__ == "__main__":
    params = handle_args()
    setup_webserver(params)
