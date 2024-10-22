import json
import logging

from aiohttp import web, WSMsgType

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("server")

active_sockets = set()


async def websocket_handler(request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)

    socket_id = id(ws)
    active_sockets.add(ws)
    logger.info(f"Socket connected: {socket_id}")

    await ws.send_json({
        "event": "update-user-list",
        "data":{
            "users": [id(s) for s in active_sockets if s != ws]
        }
    })

    for s in active_sockets:
        if s != ws:
            await s.send_json({
                "event": "update-user-list",
                "data": {
                    "users": [socket_id]
                }
            })

    async for msg in ws:
        if msg.type == WSMsgType.TEXT:
            data = json.loads(msg.data)
            event = data.get("event")
            payload = data.get("data")

            if event == "call-user":
                logger.info(f"call-user: {socket_id}")
                target_socket = next((s for s in active_sockets if id(s) == payload["to"]), None)
                if target_socket:
                    await target_socket.send_json({
                        "event": "call-made",
                        "data": {
                            "offer": payload["offer"],
                            "socket": socket_id
                        }
                    })

            elif event == "make-answer":
                logger.info(f"make-answer: {socket_id}")
                target_socket = next((s for s in active_sockets if id(s) == payload["to"]), None)
                if target_socket:
                    await target_socket.send_json({
                        "event": "answer-made",
                        "data": {
                            "socket": socket_id,
                            "answer": payload["answer"]
                        }
                    })

            elif event == "ice-candidate":
                logger.info(f"ice-candidate: {socket_id}")
                target_socket = next((s for s in active_sockets if id(s) == payload["to"]), None)
                if target_socket:
                    await target_socket.send_json({
                        "event": "ice-candidate-post",
                        "data": {
                            "socket": socket_id,
                            "candidate": payload["candidate"]
                        }
                    })

            elif event == "reject-call":
                logger.info(f"reject-call: {socket_id}")
                target_socket = next((s for s in active_sockets if id(s) == payload["from"]), None)
                if target_socket:
                    await target_socket.send_json({
                        "event": "call-rejected",
                        "data": {
                            "socket": socket_id
                        }
                    })

        elif msg.type == WSMsgType.ERROR:
            logger.error(f"WebSocket connection closed with exception {ws.exception()}")

    active_sockets.remove(ws)
    logger.info(f"Socket disconnected: {socket_id}")

    for s in active_sockets:
        await s.send_json({
            "event": "remove-user",
            "data": {
                "socketId": socket_id
            }
        })

    return ws
