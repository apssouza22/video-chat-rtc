import uuid

from aiortc.contrib.media import MediaRelay

from video_transform import VideoTransformTrack
from rtcconn import RTCConnectionHandler
import logging

logger = logging.getLogger("pc")


class StreamHandler:
    def __init__(self, conn: RTCConnectionHandler):
        self.media_player = None
        self.conn_handler = conn
        self.rtc = conn.conn
        self.media_recorder = None
        self.stream_id = "PeerConnection(%s)" % uuid.uuid4()
        self.relay = MediaRelay()

    async def close(self):
        await self.rtc.close()

    def set_media_recorder(self, media_recorder):
        self.media_recorder = media_recorder

    def set_media_player(self, media_player):
        self.media_player = media_player

    def log_info(self, msg, *args):
        logger.info(self.stream_id + " " + msg, *args)

    def on_message(self, message, channel):
        if isinstance(message, str) and message.startswith("ping"):
            channel.send("pong" + message[4:])

    async def on_connectionstatechange(self):
        self.log_info("Connection state is %s", self.rtc.connectionState)
        if self.rtc.connectionState == "failed":
            await self.rtc.close()

    def on_track(self, track):
        self.log_info("Track %s received", track.kind)

        if track.kind == "audio":
            self.rtc.addTrack(self.media_player.audio)
            self.media_recorder.addTrack(track)

        elif track.kind == "video":
            # Duplicate incoming video track so different transforms can be applied
            track1 = self.relay.subscribe(track)
            track2 = self.relay.subscribe(track)

            self.rtc.addTrack(VideoTransformTrack(track1))
            self.media_recorder.addTrack(track2)

    async def on_ended(self, track):
        self.log_info("Track %s ended", track.kind)
        await self.media_recorder.stop()

    async def start(self, params):
        await self.media_recorder.start()
        self.conn_handler.add_on_track(self.on_track)
        self.conn_handler.add_on_message(self.on_message)
        self.conn_handler.add_on_track_end(self.on_ended)
        self.conn_handler.add_on_connection_state_change(self.on_connectionstatechange)
        return await self.conn_handler.create_answer(params)
