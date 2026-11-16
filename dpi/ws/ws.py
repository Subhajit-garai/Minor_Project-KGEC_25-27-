"""
WebSocket Server & Broadcaster for DPI Real-Time Telemetry
"""
import asyncio
import json
import threading
from datetime import datetime
from typing import Set

import websockets

CONNECTED_CLIENTS: Set[any] = set()
LOOP: asyncio.AbstractEventLoop | None = None
SERVER_THREAD: threading.Thread | None = None
_packet_seq = 0


async def _handler(websocket):
    CONNECTED_CLIENTS.add(websocket)
    remote = getattr(websocket, "remote_address", "client")
    print(f"[WS] Client connected: {remote} | Active clients: {len(CONNECTED_CLIENTS)}")
    try:
        # Send welcome telemetry message
        welcome = {
            "id": "SYS-INIT",
            "status": "internet",
            "src_ip": "127.0.0.1",
            "src_port": 8000,
            "dst_ip": "127.0.0.1",
            "dst_port": 3000,
            "protocol": "WS",
            "size": 64,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "prediction": "DPI Telemetry Linked",
            "confidence": 1.0,
        }
        await websocket.send(json.dumps(welcome))
        # Keep client alive until disconnected
        await websocket.wait_closed()
    except Exception as e:
        print(f"[WS] Client connection handler exception: {e}")
    finally:
        CONNECTED_CLIENTS.discard(websocket)
        print(f"[WS] Client disconnected: {remote} | Remaining clients: {len(CONNECTED_CLIENTS)}")


def _start_loop(host="0.0.0.0", port=8000):
    global LOOP
    LOOP = asyncio.new_event_loop()
    asyncio.set_event_loop(LOOP)

    async def _main():
        try:
            async with websockets.serve(_handler, host, port):
                print(f"[WS] DPI Telemetry WebSocket Server listening on ws://{host}:{port}/ws")
                print(f"[WS] UI can connect directly to: ws://127.0.0.1:{port}/ws")
                await asyncio.Future()  # run forever
        except OSError as e:
            print(f"[WS ERROR] Failed to bind server to {host}:{port}: {e}")
            print(f"[WS TIP] Port {port} might be already in use by another running instance.")
        except Exception as e:
            print(f"[WS ERROR] Unexpected error in WebSocket server: {e}")

    try:
        LOOP.run_until_complete(_main())
    except Exception as e:
        print(f"[WS ERROR] Event loop stopped: {e}")


def start_server_background(host="0.0.0.0", port=8000):
    """Starts the WebSocket server in a daemon thread if not already running."""
    global SERVER_THREAD
    if SERVER_THREAD is None or not SERVER_THREAD.is_alive():
        SERVER_THREAD = threading.Thread(
            target=_start_loop, args=(host, port), daemon=True, name="DpiWsServer"
        )
        SERVER_THREAD.start()


def broadcast_packet(
    status: str,
    src_ip: str,
    src_port: any,
    dst_ip: str = "10.0.0.1",
    dst_port: any = 80,
    protocol: str = "TCP",
    size: int = 1500,
    packet_id: str | None = None,
    prediction: str | None = None,
    confidence: float | None = None,
    flow_key: str | None = None,
    features: dict | None = None,
):
    """
    Broadcasts a packet telemetry update to all connected WebSocket clients.
    Thread-safe; can be called directly from packet capture threads.
    """
    global _packet_seq, LOOP
    if LOOP is None:
        start_server_background()

    if not packet_id:
        _packet_seq += 1
        packet_id = f"PKT-{_packet_seq:04d}"

    payload = {
        "id": packet_id,
        "status": status,
        "src_ip": str(src_ip),
        "src_port": src_port,
        "dst_ip": str(dst_ip),
        "dst_port": dst_port,
        "protocol": protocol,
        "size": int(size),
        "type": "packet",
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }
    if prediction is not None:
        payload["prediction"] = prediction
    if confidence is not None:
        payload["confidence"] = confidence
    if flow_key is not None:
        payload["flow_key"] = flow_key
    if features is not None:
        payload["features"] = features

    message = json.dumps(payload)

    if LOOP and LOOP.is_running() and CONNECTED_CLIENTS:
        async def _send_all():
            dead_clients = []
            for client in list(CONNECTED_CLIENTS):
                try:
                    await client.send(message)
                except Exception:
                    dead_clients.append(client)
            for dc in dead_clients:
                CONNECTED_CLIENTS.discard(dc)

        try:
            asyncio.run_coroutine_threadsafe(_send_all(), LOOP)
        except Exception as e:
            print(f"[WS ERROR] Broadcast dispatch failed: {e}")
  
