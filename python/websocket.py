import json
import logging

from aiohttp import web, WSMsgType

from rtcconnmanager import RtcConnManager, conn_manager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("server")


class SocketConnHandler:

    def __init__(self, conn, sockets: [], conn_manager: RtcConnManager):
        self.conn_manager = conn_manager
        self.active_sockets = sockets
        self.conn = conn
        self.event_listeners = {}
        self.socket_id = id(conn)
        self.add_event_listeners()

    def add_event_listeners(self):
        self.event_listeners["ice-candidate"] = self.handle_ice_candidate
        self.event_listeners["make-answer"] = self.handle_call_accepted
        self.event_listeners["call-user"] = self.handle_call_user
        self.event_listeners["reject-call"] = self.handle_reject_call
        self.event_listeners["join"] = self.handle_user_connected

    async def handle_ice_candidate(self, payload):
        logger.info(f"ice-candidate: {self.socket_id}")
        target_socket = self.get_socket_conn(payload["to"])
        await target_socket.send_json({
            "event": "ice-candidate-post",
            "data": {
                "socket": self.socket_id,
                "candidate": payload["candidate"]
            }
        })

    async def handle_call_accepted(self, payload):
        logger.info(f"make-answer: {self.socket_id}")
        target_socket = self.get_socket_conn(payload["to"])
        await target_socket.send_json({
            "event": "answer-made",
            "data": {
                "socket": self.socket_id,
                "answer": payload["answer"]
            }
        })

    async def handle_call_user(self, payload):
        logger.info(f"call-user: {payload["to"]}")
        target_socket = self.get_socket_conn(payload["to"])

        logger.info(f"target_socket: {target_socket}")
        await target_socket.send_json({
            "event": "call-made",
            "data": {
                "offer": payload["offer"],
                "socket": self.socket_id
            }
        })

    def get_socket_conn(self, socket_id):
        for s in self.active_sockets:
            if id(s) == socket_id:
                return s


    async def handle_reject_call(self, payload):
        logger.info(f"reject-call: {self.socket_id}")
        target_socket = self.get_socket_conn(payload["from"])

        await target_socket.send_json({
            "event": "call-rejected",
            "data": {
                "socket": self.socket_id
            }
        })

    async def handle_user_connected(self, p):
        if self.socket_id not in self.active_sockets:
            self.active_sockets.add(self.conn)
            logger.info(f"Socket connected: {self.socket_id}")

            await self.conn.send_json({
                "event": "update-user-list",
                "data": {
                    "users": [id(s) for s in self.active_sockets if s != self.conn]
                }
            })

        for s in self.active_sockets:
            if s != self.conn:
                await s.send_json({
                    "event": "update-user-list",
                    "data": {
                        "users": [self.socket_id]
                    }
                })

    async def handle_event(self, event, payload):
        if event in self.event_listeners:
            await self.event_listeners[event](payload)
            return

        logger.warning(f"Event not found: {event}")

    async def handle_user_disconnected(self):
        self.active_sockets.remove(self.conn)
        logger.info(f"Socket disconnected: {self.socket_id}")

        for s in self.active_sockets:
            await s.send_json({
                "event": "remove-user",
                "data": {
                    "socketId": self.socket_id
                }
            })

    async def listener(self):
        async for msg in self.conn:
            if msg.type == WSMsgType.ERROR:
                logger.error(f"WebSocket connection closed with exception {self.conn.exception()}")
                return

            if msg.type == WSMsgType.TEXT:
                data = json.loads(msg.data)
                event = data.get("event")
                payload = data.get("data")
                await self.handle_event(event, payload)


active_sockets = set()


async def websocket_handler(request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)

    conn = SocketConnHandler(ws, active_sockets, conn_manager)
    await conn.listener()
    await conn.handle_user_disconnected()
    return ws
