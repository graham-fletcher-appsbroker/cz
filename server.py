import http.server
import socketserver

PORT = 8000

class HTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        http.server.SimpleHTTPRequestHandler.end_headers(self)
        



httpd = socketserver.TCPServer(("", PORT), HTTPRequestHandler)

print("serving at port", PORT)
httpd.serve_forever()
