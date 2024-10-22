from aiortc import RTCPeerConnection, RTCSessionDescription, MediaStreamTrack
from aiortc.contrib.media import MediaPlayer


class RTCConnectionHandler:

    def __init__(self):
        self.on_message_fn = None
        self.on_connection_state_change_fn = None
        self.on_track_end_fn = None
        self.on_track_fn = None
        self.conn = RTCPeerConnection()
        self.conn.on("datachannel", self._on_datachannel)
        self.conn.on("connectionstatechange", self._on_connectionstatechange)
        self.conn.on("track", self._on_track)

    def add_on_track(self, fn):
        self.on_track_fn = fn

    def add_on_track_end(self, fn):
        self.on_track_end_fn = fn

    def add_on_connection_state_change(self, fn):
        self.on_connection_state_change_fn = fn

    def add_on_message(self, fn):
        self.on_message_fn = fn

    def add_stream(self, stream: MediaPlayer):
        if stream and stream.audio:
            self.conn.addTrack(stream.audio)

        if stream and stream.video:
            self.conn.addTrack(stream.video)

        if isinstance(stream, MediaStreamTrack):
            self.conn.addTrack(stream)

    def _on_datachannel(self, channel):
        @channel.on("message")
        def on_message(message):
            self.on_message_fn(message, channel)

    async def _on_connectionstatechange(self):
        await self.on_connection_state_change_fn()


    def _on_track(self, track):
        self.on_track_fn(track)

        @track.on("ended")
        async def on_ended():
            await self.on_track_end_fn(track)

    async def create_answer(self, offer_request: dict[str, str]):
        offer = RTCSessionDescription(sdp=offer_request["sdp"], type=offer_request["type"])
        await self.conn.setRemoteDescription(offer)
        answer = await self.conn.createAnswer()
        await self.conn.setLocalDescription(answer)
        return answer
