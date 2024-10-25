import uuid

from aiortc import RTCRtpSender, MediaStreamTrack
from aiortc.contrib.media import MediaRelay

from rtcconnmanager import RtcConnManager, Channel
from video_transform import VideoTransformTrack
from rtcconn import RTCConnectionHandler
import logging

logger = logging.getLogger("stream")


class StreamHandler:
    def __init__(self, conn: RTCConnectionHandler, conn_manager: RtcConnManager):
        self.conn_manager = conn_manager
        self.media_player = None
        self.conn_handler = conn
        self.rtc = conn.conn
        self.media_recorder = None
        self.stream_id = "PeerConnection(%s)" % uuid.uuid4()
        self.relay = MediaRelay()
        self._add_event_listeners()

    async def close(self):
        await self.rtc.close()

    def set_media_recorder(self, media_recorder):
        self.media_recorder = media_recorder

    def set_media_player(self, media_player):
        self.media_player = media_player

    async def start(self, params):
        await self.media_recorder.start()
        return await self.conn_handler.create_answer(params)

    def _log_info(self, msg, *args):
        logger.info(self.stream_id + " " + msg, *args)

    def _on_message(self, message, channel):
        if isinstance(message, str) and message.startswith("ping"):
            channel.send("pong" + message[4:])

    async def _on_connectionstatechange(self):
        self._log_info("Connection state is %s", self.rtc.connectionState)
        if self.rtc.connectionState == "failed":
            await self.rtc.close()
            self._log_info("RTC Connection failed")

        if self.rtc.connectionState == "closed":
            self.conn_manager.remove_channel(self.stream_id)
            self._log_info("RTC Connection closed")

    def _on_track(self, track):
        self._log_info("Track %s received", track.kind)

        if track.kind == "audio":
            self.rtc.addTrack(self.media_player.audio)
            self.media_recorder.addTrack(track)

        elif track.kind == "video":
            # Duplicate incoming video track so different transforms can be applied
            track2 = self.relay.subscribe(track)
            track1 = self.relay.subscribe(track)
            self.media_recorder.addTrack(track2)

            sender:RTCRtpSender = self.rtc.addTrack(track1)
            self.conn_manager.add_channel(Channel(sender, track1, self.stream_id))
            self.conn_manager.broadcast(self.stream_id)




    async def _on_ended(self, track):
        self._log_info("Track %s ended", track.kind)
        await self.media_recorder.stop()

    def _add_event_listeners(self):
        self.conn_handler.add_on_track(self._on_track)
        self.conn_handler.add_on_message(self._on_message)
        self.conn_handler.add_on_track_end(self._on_ended)
        self.conn_handler.add_on_connection_state_change(self._on_connectionstatechange)



