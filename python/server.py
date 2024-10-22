import argparse
import asyncio
import json
import logging
import os
import ssl
import uuid

from aiohttp import web
from aiortc.contrib.media import MediaBlackhole, MediaPlayer, MediaRecorder, MediaRelay

from stream_handle import StreamHandler
from rtcconn import RTCConnectionHandler
from video_transform import VideoTransformTrack

ROOT = os.path.dirname(__file__)

logger = logging.getLogger("pc")
pcs = set()


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


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="WebRTC audio / video / data-channels demo"
    )
    parser.add_argument("--cert-file", help="SSL certificate file (for HTTPS)")
    parser.add_argument("--key-file", help="SSL key file (for HTTPS)")
    parser.add_argument(
        "--host", default="0.0.0.0", help="Host for HTTP server (default: 0.0.0.0)"
    )
    parser.add_argument(
        "--port", type=int, default=8080, help="Port for HTTP server (default: 8080)"
    )
    parser.add_argument("--record-to", help="Write received media to a file.")
    parser.add_argument("--verbose", "-v", action="count")
    args = parser.parse_args()

    if args.verbose:
        logging.basicConfig(level=logging.DEBUG)
    else:
        logging.basicConfig(level=logging.INFO)

    if args.cert_file:
        ssl_context = ssl.SSLContext()
        ssl_context.load_cert_chain(args.cert_file, args.key_file)
    else:
        ssl_context = None

    app = web.Application()
    app.on_shutdown.append(on_shutdown)
    app.router.add_get("/", index)
    app.router.add_get("/client.js", javascript)
    app.router.add_post("/offer", offer)
    web.run_app(
        app, access_log=None, host=args.host, port=args.port, ssl_context=ssl_context
    )
