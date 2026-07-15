import os
import re
import time
from collections import defaultdict, deque

from flask import Flask, request
from flask_cors import CORS
from dotenv import load_dotenv
from markupsafe import escape
import resend

load_dotenv()
resend.api_key = os.getenv("RESEND_API_KEY")

if not resend.api_key:
    raise RuntimeError("RESEND_API_KEY not set")

app = Flask(__name__)

# =========================================================
# CORS — only your own site(s) may call this API.
# Add every real domain that hosts a contact form pointing
# here (both portfolios, and your custom domain once it's live).
# =========================================================
ALLOWED_ORIGINS = [
    "https://aboobacker-rikkas-portfolio.vercel.app",
    # "https://your-portfolio2-domain.vercel.app",  # add once portfolio2 is live
    # "https://yourcustomdomain.com",                # add your custom domain once set up
]
CORS(
    app,
    resources={
        r"/submit": {"origins": ALLOWED_ORIGINS},
        r"/health": {"origins": ALLOWED_ORIGINS},
    },
    methods=["GET", "POST", "OPTIONS"],
)

# =========================================================
# Simple in-memory rate limiter — no extra dependency needed.
# Limits: 5 submissions per IP per 10 minutes.
# NOTE: this resets whenever the server restarts (e.g. Render
# free-tier spin-down) and won't be shared across multiple
# server instances. That's fine at personal-portfolio scale.
# For higher traffic later, swap this for Flask-Limiter + Redis.
# =========================================================
RATE_LIMIT_MAX = 5
RATE_LIMIT_WINDOW_SECONDS = 10 * 60
_submit_log = defaultdict(deque)

def is_rate_limited(ip):
    now = time.time()
    q = _submit_log[ip]
    while q and now - q[0] > RATE_LIMIT_WINDOW_SECONDS:
        q.popleft()
    if len(q) >= RATE_LIMIT_MAX:
        return True
    q.append(now)
    return False

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
MOBILE_RE = re.compile(r"^[0-9]{10}$")

MAX_LEN = {
    "fullname": 80,
    "email": 120,
    "mobile": 10,
    "emailsubject": 120,
    "message": 2000,
}


@app.route('/health')
def health():
    return "OK", 200


@app.route('/')
def home():
    return "Portfolio Backend is Running ✅"


@app.route('/submit', methods=['GET', 'POST'])
def submit():

    if request.method == 'GET':
        return "Warming up…", 200

    # ---------- 1. Rate limit by IP ----------
    client_ip = request.headers.get('X-Forwarded-For', request.remote_addr or 'unknown').split(',')[0].strip()
    if is_rate_limited(client_ip):
        return "Too many requests. Please try again later.", 429

    data = request.form

    # ---------- 2. Honeypot check (mirrors the frontend's hidden field) ----------
    # A real visitor never fills this in; a script that blindly fills every
    # field it finds usually will. Pretend success so bots don't learn to skip it.
    if data.get('website', '').strip() != '':
        return _response_html(success=True), 200

    # ---------- 3. Timing check (mirrors the frontend's 2.5s minimum) ----------
    try:
        rendered_at = int(data.get('form_rendered_at', '0'))
        if rendered_at and (time.time() * 1000 - rendered_at) < 1500:
            return "Submitted too quickly.", 400
    except ValueError:
        pass

    # ---------- 4. Required fields + format + length validation ----------
    raw = {k: (data.get(k, '') or '').strip() for k in MAX_LEN}

    if not raw["fullname"] or len(raw["fullname"]) < 2:
        return "Invalid name.", 400
    if not EMAIL_RE.match(raw["email"]) or '\n' in raw["email"] or '\r' in raw["email"]:
        return "Invalid email.", 400
    if not MOBILE_RE.match(raw["mobile"]):
        return "Invalid mobile number.", 400
    if not raw["emailsubject"]:
        return "Invalid subject.", 400
    if not raw["message"] or len(raw["message"]) < 10:
        return "Message too short.", 400

    for field, limit in MAX_LEN.items():
        if len(raw[field]) > limit:
            return f"{field} exceeds maximum length.", 400

    fullname = escape(raw["fullname"])
    email = escape(raw["email"])
    mobile = escape(raw["mobile"])
    subject = escape(raw["emailsubject"])
    message = escape(raw["message"])

    success = True
    try:
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
        <meta charset="UTF-8">
            <style>
                body {{
                    background-color: #0b0b0b;
                    font-family: Arial, sans-serif;
                    color: #ffffff;
                    padding: 20px;
                }}
                .container {{
                    max-width: 600px;
                    margin: auto;
                    background: #111111;
                    border-radius: 12px;
                    padding: 25px;
                    border: 1px solid #00b7ff;
                }}
                h2 {{
                    color: #00b7ff;
                    text-align: center;
                    margin-bottom: 20px;
                }}
                .label {{
                    color: #888;
                    font-size: 14px;
                }}
                .value {{
                    font-size: 16px;
                    margin-top: 2px;
                }}
                .message-box {{
                    margin-top: 20px;
                    padding: 15px;
                    background: #000;
                    border-radius: 8px;
                    border-left: 4px solid #00b7ff;
                    white-space: pre-wrap;
                }}
                .footer {{
                    margin-top: 25px;
                    text-align: center;
                    font-size: 12px;
                    color: #777;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <h2>📩 New Contact Message</h2>

                <div class="row">
                <div class="label">Full Name</div>
                <div class="value">{fullname}</div>
                </div>

                <div class="row">
                <div class="label">Email</div>
                <div class="value">{email}</div>
                </div>

                <div class="row">
                <div class="label">Mobile</div>
                <div class="value">{mobile}</div>
                </div>

                <div class="row">
                <div class="label">Subject</div>
                <div class="value">{subject}</div>
                </div>

                <div class="message-box">
                {message}
                </div>

                <div class="footer">
                This message was sent from your portfolio contact form.
                </div>
            </div>
        </body>
        </html>
        """
        resend.Emails.send({
            "from": "Portfolio <onboarding@resend.dev>",
            "to": ["aboobackerrikkasofficial@gmail.com"],
            "reply_to": str(email),
            "subject": f"Portfolio Contact — {subject}",
            "html": html_content
        })
    except Exception as e:
        print("Mail error:", e)
        success = False

    return _response_html(success), 200 if success else 500


def _response_html(success):
    return f"""
    <html>
    <head>
        <style>
            body {{
                background: #000000;
            }}
            .custom-alert {{
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background-color: #000000;
                border: 3px solid {('#00b7ff' if success else '#ff0000')};
                color: white;
                padding: 20px 30px;
                border-radius: 12px;
                box-shadow: 0 0 15px {'#00b7ff' if success else '#ff0000'};
                font-size: 18px;
                z-index: 9999;
                animation: fadeIn 0.5s ease;
                font-family: 'Poppins', sans-serif;
                max-width: 90vw;
                width: 30%;
                text-align: center;
            }}
            @keyframes fadeIn {{
                from {{opacity: 0;}}
                to {{opacity: 1;}}
            }}
            @media only screen and (max-width:500px) {{
                .custom-alert {{
                    font-size: 18px;
                    padding: 40px 20px;
                    width: 70vw;
                    height: auto;
                }}
            }}
            @media only screen and (min-width:768px) and (max-width:1024px) {{
                .custom-alert {{
                    font-size: 22px;
                    padding: 20px;
                    width: 60vw;
                }}
            }}
        </style>
    </head>
    <body>
        <div class="custom-alert">
            {"Message Sent Successfully!" if success else "Failed to Send Message. Try Again!"}
        </div>
        <script>
            setTimeout(() => {{
                window.location.href = "https://portfolio-ivory-kappa-61.vercel.app";
            }}, 4000);
        </script>
    </body>
    </html>
    """


if __name__ == '__main__':
    app.run()