import asyncio
import json
import logging
import signal
import sys

from websockets.server import serve
from websockets.exceptions import ConnectionClosed

# Use the MINIMAL working model
from minimal_sentence_model import setup_and_verify

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variables
server = None
websocket_clients = set()
setup_completed = False


async def handle_client(websocket, path):
    """Handle WebSocket client connections"""
    global setup_completed
    
    websocket_clients.add(websocket)
    logger.info(f"New client connected. Total clients: {len(websocket_clients)}")
    
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                logger.info(f"Received message: {data}")
                
                if data.get("type") == "sentence_verification":
                    claim = data.get("claim", "")
                    evidence = data.get("evidence", "")
                    
                    if not claim or not evidence:
                        await websocket.send(json.dumps({
                            "type": "error",
                            "message": "Both claim and evidence are required"
                        }))
                        continue
                    
                    # Notify start of verification
                    await websocket.send(json.dumps({
                        "type": "status",
                        "message": f"🔍 Starting verification for claim: '{claim[:50]}...'"
                    }))
                    
                    try:
                        # Use minimal model - setup only on first use
                        result = await setup_and_verify(
                            claim,
                            evidence,
                            setup_required=not setup_completed
                        )
                        
                        if not setup_completed:
                            setup_completed = True
                            await websocket.send(json.dumps({
                                "type": "status",
                                "message": "✅ Circuit setup completed"
                            }))
                        
                        # Send result
                        await websocket.send(json.dumps({
                            "type": "sentence_verification_result",
                            "result": result
                        }))
                        
                        logger.info(f"Verification completed: {result['verified']}")
                        
                    except Exception as e:
                        error_msg = f"Verification failed: {str(e)}"
                        logger.error(error_msg)
                        await websocket.send(json.dumps({
                            "type": "error",
                            "message": error_msg
                        }))
                
                elif data.get("type") == "health_check":
                    await websocket.send(json.dumps({
                        "type": "health_check_response",
                        "status": "healthy",
                        "setup_completed": setup_completed
                    }))
                
                else:
                    await websocket.send(json.dumps({
                        "type": "error",
                        "message": f"Unknown message type: {data.get('type')}"
                    }))
                    
            except json.JSONDecodeError:
                await websocket.send(json.dumps({
                    "type": "error",
                    "message": "Invalid JSON format"
                }))
            except Exception as e:
                logger.error(f"Error processing message: {str(e)}")
                await websocket.send(json.dumps({
                    "type": "error",
                    "message": f"Processing error: {str(e)}"
                }))
                
    except ConnectionClosed:
        logger.info("Client disconnected")
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
    finally:
        websocket_clients.discard(websocket)
        logger.info(f"Client removed. Total clients: {len(websocket_clients)}")


async def start_server():
    """Start the WebSocket server"""
    global server
    
    host = "0.0.0.0"
    port = 8765
    
    logger.info(f"🚀 Starting MINIMAL sentence verification server on {host}:{port}")
    logger.info("📝 This server uses a minimal 6-feature model for fast ZK proof generation")
    
    try:
        server = await serve(handle_client, host, port)
        logger.info("✅ Server started successfully")
        logger.info("🔄 Waiting for connections...")
        
        # Keep server running
        await server.wait_closed()
        
    except Exception as e:
        logger.error(f"Failed to start server: {str(e)}")
        raise


def signal_handler(signum, frame):
    """Handle shutdown signals"""
    logger.info(f"Received signal {signum}. Shutting down...")
    
    # Close all client connections
    if websocket_clients:
        logger.info(f"Closing {len(websocket_clients)} client connections...")
        for ws in websocket_clients.copy():
            asyncio.create_task(ws.close())
    
    # Close server
    if server:
        server.close()
    
    sys.exit(0)


if __name__ == "__main__":
    # Setup signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        asyncio.run(start_server())
    except KeyboardInterrupt:
        logger.info("Server interrupted by user")
    except Exception as e:
        logger.error(f"Server error: {str(e)}")
        sys.exit(1)