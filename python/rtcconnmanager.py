from rtcconn import RTCConnectionHandler


class RtcConnManager:

    def __init__(self):
        self.active_conns = []
        self.active_senders = []

    def add_conn(self, conn):
        self.active_conns.append(conn)

    def add_sender(self, sender):
        self.active_senders.append(sender)

    def remove_conn(self, conn):
        self.active_conns.remove(conn)

    def get_conn(self, conn_id) -> RTCConnectionHandler:
        for c in self.active_conns:
            if c == conn_id:
                return c
        return None

    def get_conns_but(self, rtc):
        return [c for c in self.active_conns if c != rtc]

    def get_senders_but(self, sender):
        return [s for s in self.active_senders if s != sender]


conn_manager = RtcConnManager()
