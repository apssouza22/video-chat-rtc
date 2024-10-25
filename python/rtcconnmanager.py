import logging

from aiortc import RTCRtpSender, MediaStreamTrack

from video_transform import VideoTransformTrack

logger = logging.getLogger("manager")

class Channel:

    def __init__(self, sender: RTCRtpSender, track: MediaStreamTrack, channel_id: str):
        self.sender = sender
        self.track = track
        self.id = channel_id


class RtcConnManager:
    _instance = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        if not hasattr(self, 'initialized'):
            self.channels = dict[str, Channel]()
            self.initialized = True

    def remove_channel(self, channel_id):
        self.channels.pop(channel_id)

    def broadcast(self, channel_id):
        logger.info("Sending video to %d other connections", len(self.channels))
        for channel in self.channels.values():
            if channel.id == channel_id:
                continue
            logger.info("Adding video track to %s", channel.sender)
            # transform_track = VideoTransformTrack(channel.sender.track)
            transform_track = channel.sender.track
            channel.sender.replaceTrack(transform_track)

    def add_channel(self, channel: Channel):
        self.channels[channel.id] = channel
