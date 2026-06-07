import json
import os
import re
import random
import sqlite3
from datetime import date, datetime, timedelta
from urllib import error as urllib_error
from urllib import request as urllib_request

from flask import Flask, flash, jsonify, redirect, render_template, request, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename

def resolve_project_root():
    def has_app_layout(path):
        if not path:
            return False
        templates_dir = os.path.join(path, "templates")
        static_dir = os.path.join(path, "static")
        return (
            os.path.isdir(templates_dir)
            and os.path.isdir(static_dir)
            and os.path.isfile(os.path.join(templates_dir, "base.html"))
        )

    script_dir = os.path.abspath(os.path.dirname(__file__))
    cwd_dir = os.path.abspath(os.getcwd())

    candidates = [script_dir, cwd_dir]

    # Look one level around likely working directories (helps after folder rename/move).
    for parent in {os.path.dirname(script_dir), os.path.dirname(cwd_dir)}:
        if not os.path.isdir(parent):
            continue
        try:
            for name in os.listdir(parent):
                child = os.path.join(parent, name)
                if os.path.isdir(child):
                    candidates.append(child)
        except OSError:
            continue

    seen = set()
    for candidate in candidates:
        if candidate in seen:
            continue
        seen.add(candidate)
        if has_app_layout(candidate):
            return candidate

    return script_dir


PROJECT_ROOT = resolve_project_root()

app = Flask(
    __name__,
    template_folder=os.path.join(PROJECT_ROOT, "templates"),
    static_folder=os.path.join(PROJECT_ROOT, "static"),
)
app.secret_key = "change-this-to-a-random-secret-key"

PROFILE_IMAGE_UPLOAD_RELATIVE_DIR = os.path.join("uploads", "profiles")
PROFILE_IMAGE_UPLOAD_DIR = os.path.join(PROJECT_ROOT, "static", PROFILE_IMAGE_UPLOAD_RELATIVE_DIR)
PROFILE_IMAGE_ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}
PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024

MOOD_CHOICES = ("Calm", "Focused", "Anxious", "Tired", "Hopeful")

MOOD_SCORES = {
    "Calm": 86,
    "Focused": 90,
    "Anxious": 48,
    "Tired": 56,
    "Hopeful": 78,
}

MOOD_NOTES = {
    "Calm": "Steady and clear.",
    "Focused": "Sharp attention and momentum.",
    "Anxious": "Mind feels noisy right now.",
    "Tired": "Energy is low. Keep it gentle.",
    "Hopeful": "Optimistic and moving forward.",
}

CONTEXT_SUGGESTIONS = {
    "Calm": [
        "Use this calm window for one deep-focus task before context switching.",
        "Capture one quiet routine you can repeat tomorrow morning.",
        "Try a 20-minute focus sprint while your mind feels steady.",
    ],
    "Focused": [
        "Channel this focus into your highest-leverage task for the next 30 minutes.",
        "Set one clear finish line for this session and close it completely.",
        "Protect your momentum with a short distraction-free block.",
    ],
    "Anxious": [
        "Try a 90-second slow-breath reset, then choose one small next action.",
        "Write down your top worry, then list one controllable step.",
        "Use a grounding check: 5 things you can see, 4 you can feel.",
    ],
    "Tired": [
        "Pick a lightweight task now and schedule a short recovery break.",
        "Reduce cognitive load by selecting one simple completion task.",
        "Hydrate and stretch for two minutes before your next activity.",
    ],
    "Hopeful": [
        "Use this hopeful energy to commit one intention for tonight.",
        "Capture one progress win and one next milestone while motivation is high.",
        "Turn this optimism into one concrete action you can finish today.",
    ],
}

REFLECTION_PROMPTS = {
    "Calm": [
        "What helped you feel most grounded today, and how can you repeat it tomorrow?",
        "When did you feel the most mental clarity today?",
        "Which boundary protected your peace today?",
    ],
    "Focused": [
        "Which condition made your focus strongest today?",
        "What interrupted your momentum, and how can you prevent it next time?",
        "What is one focused habit worth repeating this week?",
    ],
    "Anxious": [
        "What thought loop showed up most today, and what challenged it?",
        "What is one fear you can reframe into a practical next step?",
        "When anxiety spiked today, what helped you settle even a little?",
    ],
    "Tired": [
        "What drained your energy most today, and what restored it?",
        "What can you simplify tomorrow to reduce mental load?",
        "Which moment today asked too much of your energy?",
    ],
    "Hopeful": [
        "What are you looking forward to, and what supports that direction?",
        "What positive shift did you notice in yourself today?",
        "How can you convert today’s optimism into one committed action?",
    ],
}

TRAIT_GROUP_NEGATIVE = "negative"
TRAIT_GROUP_POSITIVE = "positive"
TRAIT_GROUP_NEUTRAL = "neutral"

NEGATIVE_TRAITS = {"Manipulative", "Controlling", "Gaslighting", "Toxic", "Jealous", "Jealousy"}
POSITIVE_TRAITS = {"Respectful", "Honest", "Supportive", "Trustworthy", "Consistent"}

QUESTION_LINE_RE = re.compile(r"^(\d+)\.\s*(.+)$")
OPTION_LINE_RE = re.compile(r"^([A-D])\.\s*(.+)$")
QUESTIONS_SECTION_MARKERS = {"GREEN FLAG", "RED FLAG", "NEGATIVE TRAITS", "POSITIVE TRAITS"}
OPTION_ORDER = ("A", "B", "C", "D")
KNOW_YOURSELF_QUESTIONS_PER_TRAIT = 1

RED_FLAG_TITLES = (
    "The Red Flag Ranger",
    "Chaos Controller",
    "Drama Radar Pro",
    "Boundary Bender",
    "Heatwave Vibes",
    "Storm Signal Soul",
)

GREEN_FLAG_TITLES = (
    "The Green Signal",
    "Calm Core Captain",
    "Trust Tank",
    "Lowkey Legend",
    "Steady Heart Hero",
    "Kindness Anchor",
)

BALANCED_TITLES = (
    "The Middle Mixer",
    "Chaos and Calm",
    "Nuance Navigator",
    "The Human Blend",
    "Dual Vibe Pilot",
    "Balance in Motion",
)


def get_db_connection():
    conn = sqlite3.connect(os.path.join(PROJECT_ROOT, "eumo.db"))
    conn.row_factory = sqlite3.Row
    return conn


def ensure_column_exists(conn, table_name, column_name, column_definition):
    columns = conn.execute(f"PRAGMA table_info({table_name})").fetchall()
    existing = {col[1] for col in columns}
    if column_name not in existing:
        conn.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_definition}")


def current_local_date():
    return date.today()


def iso_day(day_value):
    return day_value.strftime("%Y-%m-%d")


def parse_bool(value, fallback=None):
    if isinstance(value, bool):
        return value
    if isinstance(value, int):
        return value != 0
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in {"true", "1", "yes", "y", "on"}:
            return True
        if lowered in {"false", "0", "no", "n", "off"}:
            return False
    return fallback


def build_display_name(full_name, username):
    display_name = str(full_name or "").strip()
    if display_name:
        return display_name
    username_value = str(username or "").strip()
    if username_value:
        return username_value
    return "Friend"


def build_user_initial(full_name, username):
    display_name = build_display_name(full_name, username)
    if not display_name:
        return "E"
    first_token = display_name.strip().split()[0] if display_name.strip() else ""
    if not first_token:
        return "E"
    return first_token[0].upper()


def normalize_profile_image_path(raw_path):
    value = str(raw_path or "").strip().replace("\\", "/")
    if not value:
        return None
    if value.startswith("/"):
        value = value[1:]
    return value or None


def get_file_extension(filename):
    name = str(filename or "").strip()
    if "." not in name:
        return ""
    return name.rsplit(".", 1)[1].lower()


def build_profile_image_url(raw_path):
    relative = normalize_profile_image_path(raw_path)
    if not relative:
        return None
    return url_for("static", filename=relative)


def build_shell_context(user_row, active_nav):
    display_name = build_display_name(user_row["full_name"], user_row["username"])
    return {
        "active_nav": str(active_nav or ""),
        "user_display_name": display_name,
        "user_initial": build_user_initial(user_row["full_name"], user_row["username"]),
        "user_profile_image_url": build_profile_image_url(user_row["profile_image_path"]),
    }


def normalize_mood(value):
    if not isinstance(value, str):
        return None
    lowered = value.strip().lower()
    for mood in MOOD_CHOICES:
        if mood.lower() == lowered:
            return mood
    return None


def month_bounds(target_day):
    first = target_day.replace(day=1)
    next_month = (first.replace(day=28) + timedelta(days=4)).replace(day=1)
    last = next_month - timedelta(days=1)
    return first, last


def deterministic_pick(options, token):
    if not options:
        return None
    checksum = sum(ord(ch) for ch in str(token))
    return options[checksum % len(options)]


def slugify_text(value):
    slug = re.sub(r"[^a-z0-9]+", "-", str(value or "").strip().lower())
    slug = slug.strip("-")
    return slug or "item"


def canonical_trait_name(trait_name):
    trait = str(trait_name or "").strip()
    lowered = trait.lower()
    if lowered == "jealousy":
        return "Jealous"
    if lowered == "jealous":
        return "Jealous"
    return trait


def classify_trait_group(trait_name):
    canonical = canonical_trait_name(trait_name)
    if canonical in NEGATIVE_TRAITS:
        return TRAIT_GROUP_NEGATIVE
    if canonical in POSITIVE_TRAITS:
        return TRAIT_GROUP_POSITIVE
    return TRAIT_GROUP_NEUTRAL


def get_know_yourself_questions_path():
    return os.path.join(PROJECT_ROOT, "static", "questions.txt")


def parse_know_yourself_questions():
    path = get_know_yourself_questions_path()
    if not os.path.exists(path):
        raise ValueError("questions.txt file not found.")

    with open(path, "r", encoding="utf-8") as file:
        lines = file.read().splitlines()

    questions = []
    trait_counts = {}
    current_trait = None
    source_order = 0
    idx = 0

    while idx < len(lines):
        line = lines[idx].strip()
        idx += 1

        if not line:
            continue

        if line.upper() in QUESTIONS_SECTION_MARKERS:
            current_trait = None
            continue

        question_match = QUESTION_LINE_RE.match(line)
        if question_match:
            if not current_trait:
                continue

            question_text = question_match.group(2).strip()
            option_map = {}

            while idx < len(lines) and len(option_map) < 4:
                candidate = lines[idx].strip()
                idx += 1
                if not candidate:
                    continue
                option_match = OPTION_LINE_RE.match(candidate)
                if not option_match:
                    # Ignore malformed lines quietly to keep parser resilient.
                    continue
                option_key = option_match.group(1).upper()
                option_text = option_match.group(2).strip()
                if option_key in OPTION_ORDER:
                    option_map[option_key] = option_text

            if any(letter not in option_map for letter in OPTION_ORDER):
                raise ValueError(
                    f"Question under trait '{current_trait}' is missing one or more options (A-D)."
                )

            trait_counts[current_trait] = trait_counts.get(current_trait, 0) + 1
            question_index = trait_counts[current_trait]
            source_order += 1

            questions.append(
                {
                    "question_uid": f"{slugify_text(current_trait)}-q{question_index}",
                    "trait_name": current_trait,
                    "trait_group": classify_trait_group(current_trait),
                    "question_number": question_index,
                    "question_text": question_text,
                    "options": [
                        {"key": "A", "text": option_map["A"], "score": 1},
                        {"key": "B", "text": option_map["B"], "score": 2},
                        {"key": "C", "text": option_map["C"], "score": 3},
                        {"key": "D", "text": option_map["D"], "score": 4},
                    ],
                    "source_order": source_order,
                }
            )
            continue

        current_trait = line

    if not questions:
        raise ValueError("No questions were parsed from questions.txt.")

    return questions, trait_counts


def sync_know_yourself_question_bank(conn):
    questions, trait_counts = parse_know_yourself_questions()
    source_path = get_know_yourself_questions_path()
    source_mtime = str(int(os.path.getmtime(source_path)))
    active_ids = []

    for question in questions:
        active_ids.append(question["question_uid"])
        conn.execute(
            """
            INSERT INTO know_yourself_questions (
                question_uid, trait_name, trait_group, question_number,
                question_text, options_json, source_order, source_hash, is_active
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
            ON CONFLICT(question_uid) DO UPDATE SET
                trait_name = excluded.trait_name,
                trait_group = excluded.trait_group,
                question_number = excluded.question_number,
                question_text = excluded.question_text,
                options_json = excluded.options_json,
                source_order = excluded.source_order,
                source_hash = excluded.source_hash,
                is_active = 1,
                updated_at = CURRENT_TIMESTAMP
            """,
            (
                question["question_uid"],
                question["trait_name"],
                question["trait_group"],
                question["question_number"],
                question["question_text"],
                safe_json_dumps(question["options"]),
                question["source_order"],
                source_mtime,
            ),
        )

    if active_ids:
        placeholders = ",".join(["?"] * len(active_ids))
        conn.execute(
            f"UPDATE know_yourself_questions SET is_active = 0 WHERE question_uid NOT IN ({placeholders})",
            active_ids,
        )

    return questions, trait_counts


def get_active_know_yourself_questions(conn):
    rows = conn.execute(
        """
        SELECT
            question_uid,
            trait_name,
            trait_group,
            question_number,
            question_text,
            options_json,
            source_order
        FROM know_yourself_questions
        WHERE is_active = 1
        ORDER BY source_order ASC
        """
    ).fetchall()

    questions = []
    for row in rows:
        try:
            options = json.loads(row["options_json"] or "[]")
        except (TypeError, ValueError):
            options = []
        questions.append(
            {
                "question_uid": row["question_uid"],
                "trait_name": row["trait_name"],
                "trait_group": row["trait_group"],
                "question_number": int(row["question_number"] or 0),
                "question_text": row["question_text"],
                "options": options,
                "source_order": int(row["source_order"] or 0),
            }
        )
    return questions


def build_know_yourself_question_order(question_bank, questions_per_trait=KNOW_YOURSELF_QUESTIONS_PER_TRAIT):
    by_trait = {}
    for question in question_bank:
        trait = question["trait_name"]
        by_trait.setdefault(trait, []).append(question)

    if not by_trait:
        raise ValueError("No trait questions available.")
    if int(questions_per_trait or 0) <= 0:
        raise ValueError("questions_per_trait must be at least 1.")

    rng = random.SystemRandom()
    selected_questions = []

    for trait_name, items in by_trait.items():
        if len(items) < questions_per_trait:
            raise ValueError(
                f"Trait '{trait_name}' has fewer than {questions_per_trait} questions in questions.txt."
            )
        trait_pick = rng.sample(items, questions_per_trait)
        rng.shuffle(trait_pick)
        selected_questions.extend(trait_pick)

    rng.shuffle(selected_questions)
    return selected_questions


def map_option_to_score(option_key):
    return {"A": 1, "B": 2, "C": 3, "D": 4}.get(str(option_key or "").upper())


def normalize_trait_percentage(raw_average, trait_group):
    if raw_average is None:
        return 0.0

    clamped = max(1.0, min(4.0, float(raw_average)))
    if trait_group == TRAIT_GROUP_POSITIVE:
        return round(((4.0 - clamped) / 3.0) * 100.0, 2)
    if trait_group == TRAIT_GROUP_NEGATIVE:
        return round(((clamped - 1.0) / 3.0) * 100.0, 2)
    return round(((clamped - 1.0) / 3.0) * 100.0, 2)


def build_population_average(trait_name, trait_group):
    checksum = sum(ord(ch) for ch in str(trait_name or ""))
    base = 62 if trait_group == TRAIT_GROUP_POSITIVE else 42 if trait_group == TRAIT_GROUP_NEGATIVE else 52
    variance = (checksum % 17) - 8
    return max(18, min(88, int(base + variance)))


def build_final_label(positive_score, negative_score):
    if negative_score >= 65 and positive_score < 60:
        return "Red Flag"
    if positive_score >= 65 and negative_score < 55:
        return "Green Flag"
    return "Balanced"


def build_personality_title(label, top_positive_traits, top_negative_traits, token):
    if label == "Red Flag":
        pool = RED_FLAG_TITLES
    elif label == "Green Flag":
        pool = GREEN_FLAG_TITLES
    else:
        pool = BALANCED_TITLES

    title = deterministic_pick(pool, token) or "The Real One"
    dominant_positive = top_positive_traits[0]["trait"] if top_positive_traits else "steady vibes"
    dominant_negative = top_negative_traits[0]["trait"] if top_negative_traits else "intensity"

    if label == "Green Flag":
        description = (
            f"You radiate {dominant_positive.lower()} energy and people feel it. "
            "Keep that core strong while protecting your own boundaries."
        )
    elif label == "Red Flag":
        description = (
            f"Your {dominant_negative.lower()} side can get loud under pressure. "
            "A tiny pause before reacting can change the whole vibe."
        )
    else:
        description = (
            f"A little {dominant_positive.lower()}, a little {dominant_negative.lower()} — you're a real-world mix. "
            "Small consistent tweaks can unlock a calmer dynamic."
        )

    return title, description


def build_personality_insights(top_positive_traits, top_negative_traits):
    pos_names = [item["trait"] for item in top_positive_traits[:2]]
    neg_names = [item["trait"] for item in top_negative_traits[:2]]

    if len(pos_names) < 2:
        pos_names.extend(["Self-awareness"] * (2 - len(pos_names)))
    if len(neg_names) < 2:
        neg_names.extend(["Reactivity"] * (2 - len(neg_names)))

    insights = [
        f"Strength zone: {pos_names[0]} and {pos_names[1]} are your strongest green-signal traits.",
        f"Growth edge: {neg_names[0]} and {neg_names[1]} are worth gentle attention this month.",
        "You are not a label — this snapshot is a pattern map you can update anytime.",
    ]
    return insights


def safe_json_dumps(payload):
    try:
        return json.dumps(payload or {}, ensure_ascii=True)
    except TypeError:
        return json.dumps({"raw": str(payload)}, ensure_ascii=True)


def format_sqlite_time(ts):
    if not ts:
        return None
    formats = ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%S.%f")
    parsed = None
    for fmt in formats:
        try:
            parsed = datetime.strptime(ts, fmt)
            break
        except ValueError:
            continue
    if parsed is None:
        return ts
    return parsed.strftime("%I:%M %p").lstrip("0")


def log_user_event(conn, user_id, event_type, payload=None):
    conn.execute(
        """
        INSERT INTO user_events (user_id, event_type, event_payload)
        VALUES (?, ?, ?)
        """,
        (user_id, event_type, safe_json_dumps(payload)),
    )


def ensure_login_activity(conn, user_id, day_value=None):
    day = iso_day(day_value or current_local_date())
    conn.execute(
        """
        INSERT OR IGNORE INTO user_login_activity (user_id, activity_date)
        VALUES (?, ?)
        """,
        (user_id, day),
    )


def record_login_event(user_id, action):
    conn = get_db_connection()
    try:
        ensure_login_activity(conn, user_id)
        log_user_event(conn, user_id, action, {"activity_date": iso_day(current_local_date())})
        conn.commit()
    finally:
        conn.close()


def get_user_row(conn, user_id):
    return conn.execute(
        """
        SELECT
            id,
            full_name,
            phone_number,
            email,
            username,
            profile_image_path,
            created_at,
            consent_given,
            assessment_completed,
            journal_ai_share_enabled
        FROM users
        WHERE id = ?
        """,
        (user_id,),
    ).fetchone()


def get_user_password_hash(conn, user_id):
    row = conn.execute(
        """
        SELECT password_hash
        FROM users
        WHERE id = ?
        LIMIT 1
        """,
        (user_id,),
    ).fetchone()
    if row is None:
        return None
    return str(row["password_hash"] or "")


def compute_streak_days(conn, user_id):
    rows = conn.execute(
        """
        SELECT activity_date
        FROM user_login_activity
        WHERE user_id = ?
        """,
        (user_id,),
    ).fetchall()

    dates = {row["activity_date"] for row in rows}
    streak = 0
    cursor_day = current_local_date()

    while iso_day(cursor_day) in dates:
        streak += 1
        cursor_day -= timedelta(days=1)

    return streak


def get_weekly_active_days(conn, user_id):
    today = current_local_date()
    start = today - timedelta(days=6)
    row = conn.execute(
        """
        SELECT COUNT(DISTINCT activity_date) AS total
        FROM user_login_activity
        WHERE user_id = ? AND activity_date BETWEEN ? AND ?
        """,
        (user_id, iso_day(start), iso_day(today)),
    ).fetchone()
    return int(row["total"] or 0)


def get_most_active_time_label(conn, user_id):
    row = conn.execute(
        """
        SELECT strftime('%H', created_at) AS hour_key, COUNT(*) AS total
        FROM user_events
        WHERE user_id = ?
        GROUP BY hour_key
        ORDER BY total DESC
        LIMIT 1
        """,
        (user_id,),
    ).fetchone()

    if row is None or row["hour_key"] is None:
        return "No activity pattern yet"

    try:
        hour = int(row["hour_key"])
    except (TypeError, ValueError):
        return "No activity pattern yet"

    if 5 <= hour <= 11:
        bucket = "Morning"
    elif 12 <= hour <= 16:
        bucket = "Afternoon"
    elif 17 <= hour <= 21:
        bucket = "Evening"
    else:
        bucket = "Night"

    hour_label = datetime.strptime(f"{hour:02d}:00", "%H:%M").strftime("%I %p").lstrip("0")
    return f"{bucket} ({hour_label})"


def get_emotional_trend_label(conn, user_id):
    today = current_local_date()
    recent_start = today - timedelta(days=6)
    previous_start = today - timedelta(days=13)
    previous_end = today - timedelta(days=7)

    recent_rows = conn.execute(
        """
        SELECT mood
        FROM user_mood_checkins
        WHERE user_id = ? AND checkin_date BETWEEN ? AND ?
        """,
        (user_id, iso_day(recent_start), iso_day(today)),
    ).fetchall()
    previous_rows = conn.execute(
        """
        SELECT mood
        FROM user_mood_checkins
        WHERE user_id = ? AND checkin_date BETWEEN ? AND ?
        """,
        (user_id, iso_day(previous_start), iso_day(previous_end)),
    ).fetchall()

    recent_scores = [MOOD_SCORES[row["mood"]] for row in recent_rows if row["mood"] in MOOD_SCORES]
    previous_scores = [MOOD_SCORES[row["mood"]] for row in previous_rows if row["mood"] in MOOD_SCORES]

    if not recent_scores:
        return "Building baseline"
    if not previous_scores:
        return "Early trend forming"

    recent_avg = sum(recent_scores) / len(recent_scores)
    previous_avg = sum(previous_scores) / len(previous_scores)
    diff = recent_avg - previous_avg

    if diff >= 6:
        return "Rising"
    if diff <= -6:
        return "Needs support"
    return "Steady"


def build_settings_intelligence(conn, user_id):
    mood_entries_row = conn.execute(
        "SELECT COUNT(*) AS total FROM user_mood_checkins WHERE user_id = ?",
        (user_id,),
    ).fetchone()
    reflections_row = conn.execute(
        "SELECT COUNT(*) AS total FROM reflection_entries WHERE user_id = ?",
        (user_id,),
    ).fetchone()
    journals_row = conn.execute(
        "SELECT COUNT(*) AS total FROM journal_entries WHERE user_id = ?",
        (user_id,),
    ).fetchone()

    mood_entries = int(mood_entries_row["total"] or 0)
    reflections = int(reflections_row["total"] or 0)
    journals = int(journals_row["total"] or 0)

    return {
        "mood_entries": mood_entries,
        "journal_reflections": reflections,
        "journal_entries": journals,
        "current_streak": compute_streak_days(conn, user_id),
        "most_active_time": get_most_active_time_label(conn, user_id),
        "emotional_trend": get_emotional_trend_label(conn, user_id),
        "total_checkins": mood_entries,
    }


def get_today_mood_row(conn, user_id):
    return conn.execute(
        """
        SELECT id, mood, checkin_date, created_at
        FROM user_mood_checkins
        WHERE user_id = ? AND checkin_date = ?
        LIMIT 1
        """,
        (user_id, iso_day(current_local_date())),
    ).fetchone()


def get_month_mood_rows(conn, user_id, start_day, end_day):
    return conn.execute(
        """
        SELECT checkin_date, mood, created_at
        FROM user_mood_checkins
        WHERE user_id = ? AND checkin_date BETWEEN ? AND ?
        ORDER BY checkin_date ASC
        """,
        (user_id, iso_day(start_day), iso_day(end_day)),
    ).fetchall()


def get_micro_goals(conn, user_id):
    rows = conn.execute(
        """
        SELECT id, goal_text, is_done, created_at, completed_at
        FROM micro_goals
        WHERE user_id = ? AND is_done = 0
        ORDER BY created_at DESC
        """,
        (user_id,),
    ).fetchall()

    goals = []
    for row in rows:
        goals.append(
            {
                "id": row["id"],
                "goal_text": row["goal_text"],
                "is_done": bool(row["is_done"]),
                "created_at": row["created_at"],
                "completed_at": row["completed_at"],
            }
        )
    return goals


def normalize_journal_title(raw_title):
    title = str(raw_title or "").strip()
    if not title:
        return "Untitled note"
    if len(title) > 160:
        return title[:160].rstrip()
    return title


def normalize_journal_content(raw_content):
    content = str(raw_content or "")
    if len(content) > 200000:
        return content[:200000]
    return content


def normalize_journal_pin(raw_pin):
    pin = str(raw_pin or "").strip()
    if len(pin) == 4 and pin.isdigit():
        return pin
    return None


def build_journal_snippet(content):
    cleaned = " ".join(str(content or "").split())
    if not cleaned:
        return "No content yet."
    if len(cleaned) <= 120:
        return cleaned
    return cleaned[:120].rstrip() + "..."


def serialize_journal_row(row, include_content=True):
    title = normalize_journal_title(row["title"])
    content = str(row["content"] or "")
    is_locked = bool(row["is_locked"])
    owner_username = str(row["owner_username"] or "")
    owner_name = str(row["owner_full_name"] or owner_username or "")

    if is_locked and not include_content:
        exposed_content = ""
        snippet = "Locked note. Double tap for options."
    else:
        exposed_content = content
        snippet = build_journal_snippet(content)

    return {
        "id": row["id"],
        "title": title,
        "content": exposed_content,
        "snippet": snippet,
        "share_with_ai": bool(row["share_with_ai"]),
        "is_locked": is_locked,
        "owner_user_id": row["user_id"],
        "owner_username": owner_username,
        "owner_name": owner_name,
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def get_journal_entries(conn, user_id):
    rows = conn.execute(
        """
        SELECT
            je.id,
            je.user_id,
            je.title,
            je.content,
            je.share_with_ai,
            je.is_locked,
            je.lock_pin_hash,
            je.created_at,
            je.updated_at,
            u.username AS owner_username,
            u.full_name AS owner_full_name
        FROM journal_entries je
        JOIN users u ON u.id = je.user_id
        WHERE je.user_id = ?
        ORDER BY datetime(je.updated_at) DESC, je.id DESC
        """,
        (user_id,),
    ).fetchall()
    return [serialize_journal_row(row, include_content=not bool(row["is_locked"])) for row in rows]


def get_journal_entry_row(conn, user_id, entry_id):
    return conn.execute(
        """
        SELECT
            je.id,
            je.user_id,
            je.title,
            je.content,
            je.share_with_ai,
            je.is_locked,
            je.lock_pin_hash,
            je.created_at,
            je.updated_at,
            u.username AS owner_username,
            u.full_name AS owner_full_name
        FROM journal_entries je
        JOIN users u ON u.id = je.user_id
        WHERE je.id = ? AND je.user_id = ?
        LIMIT 1
        """,
        (entry_id, user_id),
    ).fetchone()


def validate_journal_entry_pin(entry_row, pin):
    normalized_pin = normalize_journal_pin(pin)
    if normalized_pin is None:
        return False

    pin_hash = str(entry_row["lock_pin_hash"] or "")
    if not pin_hash:
        return False

    return check_password_hash(pin_hash, normalized_pin)


def build_line_points(month_rows, start_day, end_day):
    mood_map = {row["checkin_date"]: row["mood"] for row in month_rows}
    points = []

    cursor = start_day
    while cursor <= end_day:
        day_iso = iso_day(cursor)
        mood = mood_map.get(day_iso)
        score = MOOD_SCORES.get(mood) if mood else None
        points.append(
            {
                "label": cursor.strftime("%b %d"),
                "day": cursor.day,
                "date": day_iso,
                "score": score,
            }
        )
        cursor += timedelta(days=1)

    return points


def build_bar_points(conn, user_id):
    today = current_local_date()
    start = today - timedelta(days=6)

    rows = conn.execute(
        """
        SELECT checkin_date, mood
        FROM user_mood_checkins
        WHERE user_id = ? AND checkin_date BETWEEN ? AND ?
        """,
        (user_id, iso_day(start), iso_day(today)),
    ).fetchall()

    mood_by_day = {row["checkin_date"]: row["mood"] for row in rows}
    points = []

    cursor = start
    while cursor <= today:
        key = iso_day(cursor)
        mood = mood_by_day.get(key)
        points.append(
            {
                "date": key,
                "label": cursor.strftime("%a"),
                "mood": mood,
                "score": MOOD_SCORES.get(mood) if mood else None,
            }
        )
        cursor += timedelta(days=1)

    return points


def build_pie_segments(month_rows):
    counts = {}
    for row in month_rows:
        mood = row["mood"]
        counts[mood] = counts.get(mood, 0) + 1

    segments = [{"mood": mood, "count": count} for mood, count in counts.items()]
    segments.sort(key=lambda item: item["count"], reverse=True)
    return segments


def calculate_emotional_stability(conn, user_id, month_rows, start_day, end_day):
    start_iso = iso_day(start_day)
    end_iso = iso_day(end_day)

    # 1) Mood trend
    mood_scores = [MOOD_SCORES[row["mood"]] for row in month_rows if row["mood"] in MOOD_SCORES]
    mood_component = (sum(mood_scores) / len(mood_scores)) if mood_scores else 0.0

    # 2) Micro goals activity + completion quality
    goals_row = conn.execute(
        """
        SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN is_done = 1 THEN 1 ELSE 0 END) AS done
        FROM micro_goals
        WHERE user_id = ? AND date(created_at) BETWEEN ? AND ?
        """,
        (user_id, start_iso, end_iso),
    ).fetchone()
    total_goals = int(goals_row["total"] or 0)
    done_goals = int(goals_row["done"] or 0)
    goal_completion_ratio = (done_goals / total_goals) if total_goals > 0 else 0.0
    goal_volume_ratio = min(total_goals, 10) / 10
    goals_component = ((goal_completion_ratio * 0.7) + (goal_volume_ratio * 0.3)) * 100

    # 3) Reflection engagement
    reflection_row = conn.execute(
        """
        SELECT COUNT(*) AS total
        FROM reflection_entries
        WHERE user_id = ? AND entry_date BETWEEN ? AND ?
        """,
        (user_id, start_iso, end_iso),
    ).fetchone()
    reflection_count = int(reflection_row["total"] or 0)
    reflection_component = min(reflection_count, 12) / 12 * 100

    # 4) Journal consistency
    journal_row = conn.execute(
        """
        SELECT COUNT(*) AS total
        FROM journal_entries
        WHERE user_id = ? AND date(updated_at) BETWEEN ? AND ?
        """,
        (user_id, start_iso, end_iso),
    ).fetchone()
    journal_count = int(journal_row["total"] or 0)
    journal_component = min(journal_count, 20) / 20 * 100

    # 5) Know Yourself engagement
    know_row = conn.execute(
        """
        SELECT COUNT(*) AS total
        FROM know_yourself_responses
        WHERE user_id = ? AND date(answered_at) BETWEEN ? AND ?
        """,
        (user_id, start_iso, end_iso),
    ).fetchone()
    know_count = int(know_row["total"] or 0)
    know_component = min(know_count, 10) / 10 * 100

    # 6) Core assessment activity
    assessment_row = conn.execute(
        """
        SELECT COUNT(*) AS total
        FROM assessment_sessions
        WHERE user_id = ? AND date(created_at) BETWEEN ? AND ?
        """,
        (user_id, start_iso, end_iso),
    ).fetchone()
    assessment_count = int(assessment_row["total"] or 0)
    assessment_component = min(assessment_count, 2) / 2 * 100

    weighted_score = (
        mood_component * 0.45
        + goals_component * 0.12
        + reflection_component * 0.11
        + journal_component * 0.13
        + know_component * 0.12
        + assessment_component * 0.07
    )

    return int(round(max(0, min(100, weighted_score))))


def build_context_suggestion(mood, today_value, stability_score=0, streak_days=0, journal_recent_count=0):
    if not mood:
        return "Select today's emotional state to unlock personalized activity suggestions."

    options = CONTEXT_SUGGESTIONS.get(mood, [])
    token = f"{mood}-{iso_day(today_value)}-{int(stability_score or 0)}-{int(streak_days or 0)}-{int(journal_recent_count or 0)}"
    base = deterministic_pick(options, token) or "No suggestion available right now."

    if stability_score and stability_score <= 50:
        return f"{base} Keep your next step tiny and low-pressure."
    if stability_score and stability_score >= 78:
        return f"{base} This is a strong window for deep work or a meaningful check-in."
    if streak_days >= 5:
        return f"{base} Your consistency streak is strong — protect it with one intentional action."
    if journal_recent_count >= 1:
        return f"{base} Your recent journaling momentum can help you process this faster."

    return base


def build_reflection_prompt(mood, today_value):
    if not mood:
        return "Choose today's mood to receive a guided reflection prompt."

    options = REFLECTION_PROMPTS.get(mood, [])
    token = f"{mood}-prompt-{iso_day(today_value)}"
    return deterministic_pick(options, token) or "What is one gentle action that supports your wellbeing today?"


def get_recent_stability_delta(line_points):
    numeric_scores = []
    for point in line_points or []:
        score = point.get("score") if isinstance(point, dict) else None
        if isinstance(score, (int, float)):
            numeric_scores.append(float(score))

    if len(numeric_scores) < 2:
        return 0
    return int(round(numeric_scores[-1] - numeric_scores[-2]))


def build_streak_evolution_text(streak_days):
    days = int(streak_days or 0)
    if days <= 0:
        return "Your reflection habit starts with one honest check-in."
    if days == 1:
        return "1 day of emotional consistency."
    if days < 7:
        return f"{days} days of emotional consistency."
    if days < 21:
        return "Your reflection habit is strengthening with real momentum."
    return "Consistency is now part of your emotional identity."


def build_emotional_weather(mood, stability_score, stability_delta):
    normalized_mood = normalize_mood(mood)
    score = int(stability_score or 0)
    delta = int(stability_delta or 0)

    if score >= 82:
        headline = "Clear emotional skies"
        detail = "Stable emotional rhythm with mental clarity and low noise."
        icon = "☀️"
    elif score >= 68:
        headline = "Mostly calm with passing clouds"
        detail = "Grounded baseline with minor stress pockets."
        icon = "⛅"
    elif score >= 54:
        headline = "Patchy emotional weather"
        detail = "Energy shifts are present; smaller steps will keep balance."
        icon = "🌥️"
    elif score >= 42:
        headline = "Heavy mental fog"
        detail = "Low emotional energy and high cognitive load are showing up."
        icon = "🌫️"
    else:
        headline = "Storm warning"
        detail = "Emotional overload is active. Prioritize regulation first."
        icon = "⛈️"

    if normalized_mood == "Anxious":
        detail = "Anxiety markers are elevated. Slow breathing and one controllable step can help."
    elif normalized_mood == "Focused" and score >= 68:
        detail = "Focused mental state with steady momentum and strong execution potential."
    elif normalized_mood == "Tired":
        detail = "Energy is low. Choose low-friction actions and gentle recovery blocks."
    elif normalized_mood == "Hopeful" and score >= 60:
        detail = "Hopeful tone with improving emotional rhythm."

    trend = "steady"
    if delta > 0:
        trend = "improving"
    elif delta < 0:
        trend = "declining"

    return {
        "headline": headline,
        "detail": detail,
        "icon": icon,
        "trend": trend,
        "delta": delta,
    }


def build_emotional_timeline(conn, user_id, today_value):
    start_day = today_value - timedelta(days=6)
    start_iso = iso_day(start_day)
    end_iso = iso_day(today_value)

    mood_rows = conn.execute(
        """
        SELECT checkin_date, mood, created_at
        FROM user_mood_checkins
        WHERE user_id = ? AND checkin_date BETWEEN ? AND ?
        """,
        (user_id, start_iso, end_iso),
    ).fetchall()
    mood_map = {row["checkin_date"]: row["mood"] for row in mood_rows}

    event_rows = conn.execute(
        """
        SELECT date(created_at) AS day_key,
               COUNT(*) AS total_events,
               SUM(CASE WHEN CAST(strftime('%H', created_at) AS INTEGER) >= 23 THEN 1 ELSE 0 END) AS late_events
        FROM user_events
        WHERE user_id = ? AND date(created_at) BETWEEN ? AND ?
        GROUP BY day_key
        """,
        (user_id, start_iso, end_iso),
    ).fetchall()
    events_by_day = {
        row["day_key"]: {
            "total": int(row["total_events"] or 0),
            "late": int(row["late_events"] or 0),
        }
        for row in event_rows
    }

    journal_rows = conn.execute(
        """
        SELECT date(updated_at) AS day_key, COUNT(*) AS total
        FROM journal_entries
        WHERE user_id = ? AND date(updated_at) BETWEEN ? AND ?
        GROUP BY day_key
        """,
        (user_id, start_iso, end_iso),
    ).fetchall()
    journal_by_day = {row["day_key"]: int(row["total"] or 0) for row in journal_rows}

    reflection_rows = conn.execute(
        """
        SELECT entry_date AS day_key, COUNT(*) AS total
        FROM reflection_entries
        WHERE user_id = ? AND entry_date BETWEEN ? AND ?
        GROUP BY entry_date
        """,
        (user_id, start_iso, end_iso),
    ).fetchall()
    reflection_by_day = {row["day_key"]: int(row["total"] or 0) for row in reflection_rows}

    timeline_items = []
    cursor = today_value
    while cursor >= start_day:
        day_key = iso_day(cursor)
        mood = mood_map.get(day_key)
        event_info = events_by_day.get(day_key, {"total": 0, "late": 0})
        journals = journal_by_day.get(day_key, 0)
        reflections = reflection_by_day.get(day_key, 0)

        narrative = None
        if event_info["late"] >= 3 and mood in {"Anxious", "Tired"}:
            narrative = "High stress signal detected after late-night activity spikes."
        elif journals >= 1 and reflections >= 1:
            narrative = "Recovery trend strengthened after journaling and reflection."
        elif mood == "Focused":
            narrative = "Focused rhythm appeared with sharper emotional stability markers."
        elif mood == "Calm":
            narrative = "Calm baseline held steady across the day."
        elif mood == "Hopeful":
            narrative = "Hopeful momentum appeared with positive emotional recovery."
        elif mood == "Anxious":
            narrative = "Social or cognitive load pattern appeared with elevated stress."
        elif mood == "Tired":
            narrative = "Energy depletion pattern appeared. Recovery support is recommended."
        elif event_info["total"] >= 4:
            narrative = "Activity intensity rose, but mood check-in was skipped."

        if narrative:
            timeline_items.append(
                {
                    "date": day_key,
                    "label": cursor.strftime("%b %d"),
                    "message": narrative,
                }
            )

        cursor -= timedelta(days=1)

    timeline_items.sort(key=lambda item: item["date"])
    if not timeline_items:
        timeline_items = [
            {
                "date": end_iso,
                "label": today_value.strftime("%b %d"),
                "message": "Start your first check-in to build your emotional memory timeline.",
            }
        ]

    return timeline_items[-5:]


def build_emotional_achievements(conn, user_id, streak_days):
    reflections_row = conn.execute(
        "SELECT COUNT(*) AS total FROM reflection_entries WHERE user_id = ?",
        (user_id,),
    ).fetchone()
    reflections_count = int(reflections_row["total"] or 0)

    calm_streak_row = conn.execute(
        """
        SELECT COUNT(*) AS total
        FROM user_mood_checkins
        WHERE user_id = ? AND mood IN ('Calm', 'Hopeful', 'Focused')
          AND checkin_date >= ?
        """,
        (user_id, iso_day(current_local_date() - timedelta(days=6))),
    ).fetchone()
    calm_recent_count = int(calm_streak_row["total"] or 0)

    know_row = conn.execute(
        "SELECT COUNT(*) AS total FROM know_yourself_responses WHERE user_id = ?",
        (user_id,),
    ).fetchone()
    know_count = int(know_row["total"] or 0)

    achievements = [
        {
            "key": "first_reflection",
            "title": "First honest reflection",
            "subtitle": "Captured your first emotional journal/reflection signal.",
            "unlocked": reflections_count >= 1,
            "progress": min(reflections_count, 1),
            "target": 1,
        },
        {
            "key": "consistency_7",
            "title": "7-day consistency",
            "subtitle": "A week of steady check-ins builds emotional resilience.",
            "unlocked": int(streak_days or 0) >= 7,
            "progress": min(int(streak_days or 0), 7),
            "target": 7,
        },
        {
            "key": "recovery_phase",
            "title": "Calm recovery phase",
            "subtitle": "Multiple calm/hopeful/focused states in one week.",
            "unlocked": calm_recent_count >= 4,
            "progress": min(calm_recent_count, 4),
            "target": 4,
        },
        {
            "key": "self_awareness",
            "title": "Self-awareness milestone",
            "subtitle": "Completed enough trait answers to map behavioral patterns.",
            "unlocked": know_count >= 10,
            "progress": min(know_count, 10),
            "target": 10,
        },
    ]
    return achievements


def build_emotional_insight_cards(conn, user_id):
    cards = []

    late_journal_row = conn.execute(
        """
        SELECT COUNT(*) AS total
        FROM journal_entries
        WHERE user_id = ? AND CAST(strftime('%H', updated_at) AS INTEGER) >= 22
        """,
        (user_id,),
    ).fetchone()
    late_journal_count = int(late_journal_row["total"] or 0)
    if late_journal_count >= 2:
        cards.append(
            {
                "title": "Night Reflection Pattern",
                "detail": "You tend to journal more honestly late at night.",
            }
        )

    sleep_pattern_row = conn.execute(
        """
        SELECT mood, COUNT(*) AS total
        FROM user_mood_checkins
        WHERE user_id = ?
        GROUP BY mood
        ORDER BY total DESC
        LIMIT 1
        """,
        (user_id,),
    ).fetchone()
    if sleep_pattern_row:
        dominant_mood = str(sleep_pattern_row["mood"] or "").lower()
        cards.append(
            {
                "title": "Dominant Emotional Tone",
                "detail": f"Your recent check-ins lean toward {dominant_mood} states.",
            }
        )

    reflection_ratio_row = conn.execute(
        """
        SELECT
            (SELECT COUNT(*) FROM reflection_entries WHERE user_id = ?) AS reflections,
            (SELECT COUNT(*) FROM user_mood_checkins WHERE user_id = ?) AS checkins
        """,
        (user_id, user_id),
    ).fetchone()
    reflections = int(reflection_ratio_row["reflections"] or 0)
    checkins = int(reflection_ratio_row["checkins"] or 0)
    if checkins > 0 and reflections > 0:
        ratio = reflections / checkins
        if ratio >= 0.6:
            cards.append(
                {
                    "title": "Reflection Advantage",
                    "detail": "Your emotional stability improves when reflection follows check-ins.",
                }
            )

    if len(cards) < 3:
        fallback = [
            {
                "title": "Pattern Building",
                "detail": "Consistent check-ins help detect stress and recovery cycles earlier.",
            },
            {
                "title": "Micro Goal Momentum",
                "detail": "Small completed goals often correlate with steadier emotional rhythm.",
            },
            {
                "title": "Self-awareness Signal",
                "detail": "Honest inputs improve the quality of your emotional insights over time.",
            },
        ]
        for item in fallback:
            if len(cards) >= 3:
                break
            if item not in cards:
                cards.append(item)

    return cards[:3]


def build_daily_opening_payload(display_name, mood, stability_score, trend_label):
    now = datetime.now()
    hour = now.hour
    if 5 <= hour < 12:
        greeting = "Good morning"
    elif 12 <= hour < 17:
        greeting = "Good afternoon"
    elif 17 <= hour < 22:
        greeting = "Good evening"
    else:
        greeting = "Good night"

    mood_value = normalize_mood(mood)
    score = int(stability_score or 0)

    if score >= 78:
        insight = "Your emotional rhythm feels steady today."
    elif score >= 60:
        insight = "Your emotional pattern is stabilizing with steady effort."
    elif score >= 45:
        insight = "Your rhythm is mixed today. Keep your next action gentle."
    else:
        insight = "Your system shows overload signs. Slow support-first actions can help."

    if mood_value == "Focused":
        insight = "You’re entering a focused state. Protect this window intentionally."
    elif mood_value == "Anxious":
        insight = "Your system feels tense right now. Tiny controllable steps will help."
    elif trend_label == "Rising":
        insight = "Your emotional rhythm is trending upward this week."

    return {
        "id": f"{iso_day(current_local_date())}:{score}:{mood_value or 'none'}",
        "greeting": f"{greeting}, {display_name}.",
        "insight": insight,
    }


def build_echo_fallback_reply(message_text, mood):
    mood_hint = (
        f"I notice you checked in as {mood.lower()} today. " if isinstance(mood, str) and mood else ""
    )
    guidance = build_context_suggestion(mood, current_local_date()) if mood else "Take one small, kind step right now."
    return (
        f"{mood_hint}Thank you for sharing that. {guidance} "
        "If you want, tell me what feels hardest in this moment and we can break it into one next action."
    )


def build_echo_journal_summary(conn, user_id):
    rows = conn.execute(
        """
        SELECT title, content, updated_at
        FROM journal_entries
        WHERE user_id = ? AND share_with_ai = 1
        ORDER BY updated_at DESC
        LIMIT 12
        """,
        (user_id,),
    ).fetchall()

    if not rows:
        return {
            "entries": 0,
            "word_count": 0,
            "patterns": [],
        }

    text_blob = " ".join(f"{row['title'] or ''} {row['content'] or ''}" for row in rows).lower()
    word_count = len([w for w in re.split(r"\s+", text_blob) if w.strip()])

    def has_any(keywords):
        return any(k in text_blob for k in keywords)

    patterns = []
    if has_any(["overwhelm", "overwhelmed", "anxious", "panic", "worry", "stressed", "stress"]):
        patterns.append("stress load has been recurring in recent reflections")
    if has_any(["tired", "drained", "exhausted", "burnout", "fatigue", "sleep"]):
        patterns.append("energy depletion is showing up repeatedly")
    if has_any(["alone", "lonely", "ignored", "social", "people", "friend"]):
        patterns.append("social energy seems to be a meaningful trigger")
    if has_any(["grateful", "calm", "hopeful", "better", "improving", "progress"]):
        patterns.append("there are clear recovery signals in your entries")
    if not patterns:
        patterns.append("your writing shows mixed emotional signals that are still forming")

    return {
        "entries": len(rows),
        "word_count": word_count,
        "patterns": patterns[:2],
    }


def classify_echo_theme(message_text):
    text = str(message_text or "").lower()
    theme_map = [
        ("exhaustion", ["exhausted", "drained", "burnout", "burned out", "fatigue", "tired"]),
        ("anxiety", ["anxious", "panic", "worried", "fear", "restless", "overwhelm", "overwhelmed"]),
        ("overthinking", ["overthink", "replay", "ruminate", "can't stop thinking", "loop"]),
        ("social", ["people", "friend", "family", "social", "relationship", "alone", "lonely"]),
        ("focus", ["focus", "distracted", "productive", "concentrate", "study"]),
        ("motivation", ["motivation", "stuck", "procrastinate", "lazy", "no energy"]),
    ]
    for theme, keywords in theme_map:
        if any(k in text for k in keywords):
            return theme
    return "general_reflection"


def is_echo_out_of_scope(message_text):
    text = str(message_text or "").lower().strip()
    if not text:
        return False

    general_markers = [
        "what is",
        "who is",
        "solve",
        "equation",
        "code",
        "python",
        "java",
        "news",
        "stock",
        "weather",
        "capital of",
        "translate",
        "joke",
    ]
    emotional_markers = [
        "feel",
        "emotion",
        "mood",
        "stress",
        "anxious",
        "tired",
        "overwhelm",
        "sad",
        "lonely",
        "focus",
        "burnout",
        "reflection",
    ]

    has_general = any(marker in text for marker in general_markers)
    has_emotional = any(marker in text for marker in emotional_markers)
    return has_general and not has_emotional


def build_echo_guided_reply(message_text, mood, stability_score, trend_label, journal_summary):
    if is_echo_out_of_scope(message_text):
        return {
            "theme": "scope_guard",
            "reply": (
                "I am built for emotional reflection inside EUMO, not general Q&A.\n"
                "If you want, share how you are feeling right now and I can guide one structured reflection step."
            ),
        }

    theme = classify_echo_theme(message_text)
    mood_name = normalize_mood(mood) or "Unknown"
    score = int(stability_score or 0)
    trend = str(trend_label or "steady").lower()
    patterns = list(journal_summary.get("patterns") or [])

    theme_openers = {
        "exhaustion": "That sounds more like emotional depletion than simple tiredness.",
        "anxiety": "It sounds like your system is carrying extra pressure right now.",
        "overthinking": "That sounds like a thought loop, not a small passing worry.",
        "social": "This sounds emotionally social, not just practical.",
        "focus": "You are noticing your attention pattern in a useful way.",
        "motivation": "This sounds less like laziness and more like emotional friction.",
        "general_reflection": "Thanks for sharing that honestly.",
    }

    guided_paths = {
        "exhaustion": ["social exhaustion", "emotional masking", "overstimulation"],
        "anxiety": ["uncertainty pressure", "body tension signals", "control vs. influence"],
        "overthinking": ["trigger thought", "worst-case script", "one grounded action"],
        "social": ["boundary fatigue", "approval pressure", "conflict recovery"],
        "focus": ["attention blockers", "energy timing", "single-task closure"],
        "motivation": ["micro-start friction", "perfection pressure", "low-energy planning"],
        "general_reflection": ["what feels heavy", "what feels unfinished", "what feels controllable"],
    }

    lines = [theme_openers.get(theme, "Thanks for sharing that honestly.")]

    if mood_name != "Unknown":
        lines.append(f"Current mood signal: {mood_name}.")

    if score <= 48:
        lines.append("Your emotional score suggests overload, so we will keep this very light.")
    elif trend == "rising":
        lines.append("Your trend is rising, so there is already some recovery momentum here.")

    if patterns:
        lines.append(f"Recent journal pattern: {patterns[0]}.")

    paths = guided_paths.get(theme, guided_paths["general_reflection"])
    lines.append(
        "Would you like to explore:\n"
        f"1) {paths[0]}\n"
        f"2) {paths[1]}\n"
        f"3) {paths[2]}"
    )
    lines.append("Reply with 1, 2, or 3 and I will guide one short reflection step.")

    return {
        "theme": theme,
        "reply": "\n".join(lines),
    }


def parse_echo_response_text(payload):
    if not isinstance(payload, dict):
        return ""

    output_text = payload.get("output_text")
    if isinstance(output_text, str) and output_text.strip():
        return output_text.strip()

    output = payload.get("output")
    if not isinstance(output, list):
        return ""

    parts = []
    for item in output:
        if not isinstance(item, dict):
            continue
        content = item.get("content")
        if not isinstance(content, list):
            continue
        for content_item in content:
            if not isinstance(content_item, dict):
                continue
            text = content_item.get("text")
            if isinstance(text, str) and text.strip():
                parts.append(text.strip())

    return "\n".join(parts).strip()


def build_dashboard_payload(conn, user_row):
    user_id = user_row["id"]
    today = current_local_date()
    display_name = build_display_name(user_row["full_name"], user_row["username"])

    ensure_login_activity(conn, user_id, today)

    streak_days = compute_streak_days(conn, user_id)
    weekly_active = get_weekly_active_days(conn, user_id)

    today_mood_row = get_today_mood_row(conn, user_id)
    today_mood = today_mood_row["mood"] if today_mood_row else None

    month_start, month_end = month_bounds(today)
    month_rows = get_month_mood_rows(conn, user_id, month_start, today)

    emotional_stability = calculate_emotional_stability(conn, user_id, month_rows, month_start, today)
    line_points = build_line_points(month_rows, month_start, today)
    bar_points = build_bar_points(conn, user_id)
    pie_segments = build_pie_segments(month_rows)
    stability_delta = get_recent_stability_delta(line_points)
    trend_label = get_emotional_trend_label(conn, user_id)

    checkin_completed = today_mood is not None
    journal_recent_row = conn.execute(
        """
        SELECT COUNT(*) AS total
        FROM journal_entries
        WHERE user_id = ? AND date(updated_at) = ?
        """,
        (user_id, iso_day(today)),
    ).fetchone()
    journal_recent_count = int(journal_recent_row["total"] or 0)

    checkin_subtitle = (
        f"Mood logged at {format_sqlite_time(today_mood_row['created_at'])}."
        if checkin_completed
        else "Pick one mood to complete today's check-in."
    )

    emotional_timeline = build_emotional_timeline(conn, user_id, today)
    emotional_weather = build_emotional_weather(today_mood, emotional_stability, stability_delta)
    emotional_achievements = build_emotional_achievements(conn, user_id, streak_days)
    emotional_insight_cards = build_emotional_insight_cards(conn, user_id)

    payload = {
        "ok": True,
        "server_now": datetime.utcnow().isoformat() + "Z",
        "username": display_name,
        "streak_days": streak_days,
        "streak_evolution": build_streak_evolution_text(streak_days),
        "weekly_progress": {
            "active_days": weekly_active,
            "target_days": 7,
        },
        "check_in": {
            "completed": checkin_completed,
            "status": "Completed" if checkin_completed else "Pending",
            "title": "Check-in completed" if checkin_completed else "Not completed",
            "subtitle": checkin_subtitle,
        },
        "mood": {
            "today": today_mood,
            "note": MOOD_NOTES.get(today_mood) if today_mood else None,
            "locked": checkin_completed,
        },
        "emotional_stability": {
            "score": emotional_stability,
            "delta": stability_delta,
            "trend": trend_label,
            "month_label": today.strftime("%B %Y"),
            "line_points": line_points,
            "bar_points": bar_points,
            "pie_segments": pie_segments,
        },
        "emotional_weather": emotional_weather,
        "emotional_timeline": emotional_timeline,
        "emotional_achievements": emotional_achievements,
        "emotional_insight_cards": emotional_insight_cards,
        "opening_experience": build_daily_opening_payload(display_name, today_mood, emotional_stability, trend_label),
        "context_suggestion": build_context_suggestion(today_mood, today),
        "orb_context": {
            "journal_today_count": journal_recent_count,
            "streak_days": streak_days,
            "stability_score": emotional_stability,
            "mood": today_mood,
            "trend": trend_label,
        },
        "reflection_prompt": build_reflection_prompt(today_mood, today),
        "micro_goals": get_micro_goals(conn, user_id),
        "empty_state_copy": {
            "goals": "Small intentional goals can slowly stabilize emotional momentum.",
            "timeline": "Your emotional memory starts with one honest check-in.",
            "insights": "Keep showing up. Your pattern story becomes clearer with each entry.",
        },
    }

    payload["context_suggestion"] = build_context_suggestion(
        today_mood,
        today,
        emotional_stability,
        streak_days,
        journal_recent_count,
    )

    return payload


def build_journal_payload(conn, user_row):
    user_id = user_row["id"]
    ensure_login_activity(conn, user_id, current_local_date())

    entries = get_journal_entries(conn, user_id)
    ai_sharing_value = user_row["journal_ai_share_enabled"]

    return {
        "ok": True,
        "username": user_row["full_name"] or user_row["username"],
        "ai_sharing_enabled": None if ai_sharing_value is None else bool(ai_sharing_value),
        "entries": entries,
    }


def serialize_know_yourself_question(question):
    return {
        "question_id": question["question_uid"],
        "trait": question["trait_name"],
        "trait_group": question["trait_group"],
        "question_number": question["question_number"],
        "question_text": question["question_text"],
        "options": [
            {"key": opt.get("key"), "text": opt.get("text")}
            for opt in question.get("options", [])
            if opt.get("key") in OPTION_ORDER
        ],
    }


def get_know_yourself_session_row(conn, user_id, session_id):
    return conn.execute(
        """
        SELECT *
        FROM know_yourself_sessions
        WHERE id = ? AND user_id = ?
        LIMIT 1
        """,
        (session_id, user_id),
    ).fetchone()


def get_know_yourself_response_rows(conn, session_id):
    return conn.execute(
        """
        SELECT question_uid, selected_option, selected_option_text, score, answered_at
        FROM know_yourself_responses
        WHERE session_id = ?
        ORDER BY id ASC
        """,
        (session_id,),
    ).fetchall()


def build_know_yourself_result_payload(question_bank, response_rows, session_id):
    responses_by_question = {
        row["question_uid"]: {
            "selected_option": row["selected_option"],
            "selected_option_text": row["selected_option_text"],
            "score": float(row["score"] or 0),
            "answered_at": row["answered_at"],
        }
        for row in response_rows
    }

    trait_scores_map = {}
    trait_order = []

    for question in question_bank:
        qid = question["question_uid"]
        if qid not in responses_by_question:
            continue
        trait_name = question["trait_name"]
        if trait_name not in trait_scores_map:
            trait_scores_map[trait_name] = {
                "trait": trait_name,
                "trait_group": question["trait_group"],
                "scores": [],
            }
            trait_order.append(trait_name)
        trait_scores_map[trait_name]["scores"].append(responses_by_question[qid]["score"])

    trait_scores = []
    for trait_name in trait_order:
        item = trait_scores_map[trait_name]
        score_values = item["scores"]
        if not score_values:
            continue
        raw_avg = sum(score_values) / len(score_values)
        normalized = normalize_trait_percentage(raw_avg, item["trait_group"])
        trait_scores.append(
            {
                "trait": trait_name,
                "trait_group": item["trait_group"],
                "raw_average": round(raw_avg, 3),
                "score_percent": round(normalized, 2),
                "population_average": build_population_average(trait_name, item["trait_group"]),
                "question_count": len(score_values),
            }
        )

    positive_trait_scores = [
        item for item in trait_scores if item["trait_group"] == TRAIT_GROUP_POSITIVE
    ]
    negative_trait_scores = [
        item for item in trait_scores if item["trait_group"] == TRAIT_GROUP_NEGATIVE
    ]

    positive_score = (
        sum(item["score_percent"] for item in positive_trait_scores) / len(positive_trait_scores)
        if positive_trait_scores
        else 0.0
    )
    negative_score = (
        sum(item["score_percent"] for item in negative_trait_scores) / len(negative_trait_scores)
        if negative_trait_scores
        else 0.0
    )

    positive_score = round(positive_score, 2)
    negative_score = round(negative_score, 2)

    top_positive = sorted(positive_trait_scores, key=lambda item: item["score_percent"], reverse=True)[:2]
    top_negative = sorted(negative_trait_scores, key=lambda item: item["score_percent"], reverse=True)[:2]

    final_label = build_final_label(positive_score, negative_score)
    title_token = f"{session_id}-{int(positive_score)}-{int(negative_score)}"
    personality_title, personality_description = build_personality_title(
        final_label,
        top_positive,
        top_negative,
        title_token,
    )
    insights = build_personality_insights(top_positive, top_negative)

    return {
        "session_id": session_id,
        "submitted_at": datetime.utcnow().isoformat() + "Z",
        "total_questions": len(question_bank),
        "summary": {
            "positive_score": positive_score,
            "negative_score": negative_score,
            "final_label": final_label,
        },
        "personality": {
            "title": personality_title,
            "description": personality_description,
        },
        "insights": {
            "top_positive_traits": top_positive,
            "top_negative_traits": top_negative,
            "summary_lines": insights,
        },
        "trait_scores": trait_scores,
    }


def get_latest_know_yourself_result(conn, user_id):
    row = conn.execute(
        """
        SELECT result_payload
        FROM know_yourself_results
        WHERE user_id = ?
        ORDER BY id DESC
        LIMIT 1
        """,
        (user_id,),
    ).fetchone()
    if row is None:
        return None
    try:
        payload = json.loads(row["result_payload"] or "{}")
        return payload if isinstance(payload, dict) else None
    except (TypeError, ValueError):
        return None


def require_dashboard_api_user():
    user_id = session.get("user_id")
    if not user_id:
        return None, None, (jsonify({"ok": False, "message": "Please sign in first."}), 401)

    conn = get_db_connection()
    user_row = get_user_row(conn, user_id)

    if user_row is None:
        conn.close()
        session.clear()
        return None, None, (jsonify({"ok": False, "message": "Account session is invalid."}), 401)

    if user_row["consent_given"] != 1:
        conn.close()
        return None, None, (jsonify({"ok": False, "message": "Please complete consent first."}), 403)

    if user_row["assessment_completed"] != 1:
        conn.close()
        return None, None, (jsonify({"ok": False, "message": "Please complete assessment first."}), 403)

    return conn, user_row, None


def init_db():
    conn = get_db_connection()

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            phone_number TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            terms_accepted INTEGER NOT NULL DEFAULT 0,
            consent_given INTEGER NOT NULL DEFAULT 0,
            assessment_completed INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    # Backward-safe migration for existing local DB files
    ensure_column_exists(conn, "users", "consent_given", "INTEGER NOT NULL DEFAULT 0")
    ensure_column_exists(conn, "users", "assessment_completed", "INTEGER NOT NULL DEFAULT 0")
    ensure_column_exists(conn, "users", "journal_ai_share_enabled", "INTEGER")
    ensure_column_exists(conn, "users", "profile_image_path", "TEXT")

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS user_login_activity (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            activity_date TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, activity_date),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS user_mood_checkins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            mood TEXT NOT NULL,
            checkin_date TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, checkin_date),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS micro_goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            goal_text TEXT NOT NULL,
            is_done INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS reflection_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            mood TEXT,
            prompt TEXT NOT NULL,
            answer TEXT NOT NULL,
            entry_date TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS assessment_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            dominant_emotion TEXT,
            severity TEXT,
            total_answered INTEGER NOT NULL DEFAULT 0,
            total_skipped INTEGER NOT NULL DEFAULT 0,
            result_payload TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS know_yourself_questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question_uid TEXT NOT NULL UNIQUE,
            trait_name TEXT NOT NULL,
            trait_group TEXT NOT NULL,
            question_number INTEGER NOT NULL,
            question_text TEXT NOT NULL,
            options_json TEXT NOT NULL,
            source_order INTEGER NOT NULL,
            source_hash TEXT,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    ensure_column_exists(conn, "know_yourself_questions", "source_hash", "TEXT")
    ensure_column_exists(conn, "know_yourself_questions", "is_active", "INTEGER NOT NULL DEFAULT 1")

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS know_yourself_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'in_progress',
            total_questions INTEGER NOT NULL DEFAULT 0,
            question_order_json TEXT NOT NULL,
            result_payload TEXT,
            started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS know_yourself_responses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            question_uid TEXT NOT NULL,
            trait_name TEXT NOT NULL,
            selected_option TEXT NOT NULL,
            selected_option_text TEXT NOT NULL,
            score INTEGER NOT NULL,
            answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(session_id, question_uid),
            FOREIGN KEY (session_id) REFERENCES know_yourself_sessions(id),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (question_uid) REFERENCES know_yourself_questions(question_uid)
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS know_yourself_trait_scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            trait_name TEXT NOT NULL,
            trait_group TEXT NOT NULL,
            raw_average REAL NOT NULL,
            score_percent REAL NOT NULL,
            answered_count INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(session_id, trait_name),
            FOREIGN KEY (session_id) REFERENCES know_yourself_sessions(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS know_yourself_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL UNIQUE,
            user_id INTEGER NOT NULL,
            positive_score REAL NOT NULL,
            negative_score REAL NOT NULL,
            final_label TEXT NOT NULL,
            personality_title TEXT NOT NULL,
            personality_description TEXT NOT NULL,
            insights_json TEXT NOT NULL,
            result_payload TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES know_yourself_sessions(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS user_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            event_type TEXT NOT NULL,
            event_payload TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS journal_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL DEFAULT 'Untitled note',
            content TEXT NOT NULL DEFAULT '',
            share_with_ai INTEGER NOT NULL DEFAULT 0,
            is_locked INTEGER NOT NULL DEFAULT 0,
            lock_pin_hash TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        """
    )
    ensure_column_exists(conn, "journal_entries", "is_locked", "INTEGER NOT NULL DEFAULT 0")
    ensure_column_exists(conn, "journal_entries", "lock_pin_hash", "TEXT")

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS journal_deleted_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            original_entry_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            owner_username TEXT,
            owner_name TEXT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            share_with_ai INTEGER NOT NULL DEFAULT 0,
            is_locked INTEGER NOT NULL DEFAULT 0,
            lock_pin_hash TEXT,
            original_created_at TEXT,
            original_updated_at TEXT,
            deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_by_user_id INTEGER NOT NULL,
            ai_access_blocked INTEGER NOT NULL DEFAULT 1,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (deleted_by_user_id) REFERENCES users(id)
        )
        """
    )

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_login_activity_user_date ON user_login_activity(user_id, activity_date)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_mood_checkins_user_date ON user_mood_checkins(user_id, checkin_date)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_micro_goals_user_created ON micro_goals(user_id, created_at)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_reflections_user_date ON reflection_entries(user_id, entry_date)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_assessment_sessions_user_created ON assessment_sessions(user_id, created_at)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_ky_questions_active_order ON know_yourself_questions(is_active, source_order)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_ky_sessions_user_started ON know_yourself_sessions(user_id, started_at)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_ky_responses_session ON know_yourself_responses(session_id, answered_at)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_ky_trait_scores_session ON know_yourself_trait_scores(session_id, trait_name)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_ky_results_user_created ON know_yourself_results(user_id, created_at)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_user_events_user_created ON user_events(user_id, created_at)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_journal_entries_user_updated ON journal_entries(user_id, updated_at)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_journal_deleted_user_deleted ON journal_deleted_entries(user_id, deleted_at)"
    )

    os.makedirs(PROFILE_IMAGE_UPLOAD_DIR, exist_ok=True)
    conn.commit()
    conn.close()


init_db()


@app.route("/")
def landing():
    return render_template("landing.html")


@app.route("/eumo-info")
def eumo_info():
    return render_template("eumo_info.html")


@app.route("/signin", methods=["GET", "POST"])
def signin():
    mode = request.args.get("mode", "login")

    if request.method == "POST":
        action = request.form.get("action", "").strip()

        if action == "signup":
            full_name = request.form.get("full_name", "").strip()
            phone_number = request.form.get("phone_number", "").strip()
            email = request.form.get("email", "").strip().lower()
            username = request.form.get("username", "").strip().lower()
            password = request.form.get("password", "")
            confirm_password = request.form.get("confirm_password", "")
            terms_accepted = 1 if request.form.get("terms_accepted") == "on" else 0

            if not all([full_name, phone_number, email, username, password, confirm_password]):
                flash("Please fill all required sign-up fields.", "error")
                return render_template("signin.html", mode="signup")

            if not re.match(r"^[^@]+@[^@]+\.[^@]+$", email):
                flash("Please enter a valid email address.", "error")
                return render_template("signin.html", mode="signup")

            if len(password) < 8:
                flash("Password must be at least 8 characters.", "error")
                return render_template("signin.html", mode="signup")

            if password != confirm_password:
                flash("Passwords do not match.", "error")
                return render_template("signin.html", mode="signup")

            if terms_accepted != 1:
                flash("Please accept the terms to continue.", "error")
                return render_template("signin.html", mode="signup")

            conn = get_db_connection()
            existing = conn.execute(
                "SELECT id FROM users WHERE email = ? OR username = ?",
                (email, username),
            ).fetchone()

            if existing:
                conn.close()
                flash("Email or username already exists.", "error")
                return render_template("signin.html", mode="signup")

            password_hash = generate_password_hash(password, method="pbkdf2:sha256")
            cursor = conn.execute(
                """
                INSERT INTO users (
                    full_name, phone_number, email, username, password_hash,
                    terms_accepted, consent_given, assessment_completed
                )
                VALUES (?, ?, ?, ?, ?, ?, 0, 0)
                """,
                (full_name, phone_number, email, username, password_hash, terms_accepted),
            )
            conn.commit()
            new_user_id = cursor.lastrowid
            conn.close()

            # Auto-login after signup
            session["user_id"] = new_user_id
            session["username"] = username
            record_login_event(new_user_id, "signup_login")

            flash("Account created. Please review consent to continue.", "success")
            return redirect(url_for("consent"))

        if action == "login":
            login_id = request.form.get("login_id", "").strip().lower()
            password = request.form.get("password", "")

            if not login_id or not password:
                flash("Please enter username/email and password.", "error")
                return render_template("signin.html", mode="login")

            conn = get_db_connection()
            user = conn.execute(
                """
                SELECT id, username, password_hash, consent_given, assessment_completed
                FROM users
                WHERE email = ? OR username = ?
                """,
                (login_id, login_id),
            ).fetchone()
            conn.close()

            if not user or not check_password_hash(user["password_hash"], password):
                flash("Invalid credentials.", "error")
                return render_template("signin.html", mode="login")

            session["user_id"] = user["id"]
            session["username"] = user["username"]
            record_login_event(user["id"], "signin_login")
            flash("Welcome back.", "success")

            if user["consent_given"] != 1:
                return redirect(url_for("consent"))
            if user["assessment_completed"] != 1:
                return redirect(url_for("assessments"))
            return redirect(url_for("dashboard"))

    return render_template("signin.html", mode=mode)


@app.route("/logout")
def logout():
    session.clear()
    flash("Logged out.", "success")
    return redirect(url_for("signin", mode="login"))


@app.route("/consent", methods=["GET", "POST"])
def consent():
    if "user_id" not in session:
        flash("Please sign in first.", "error")
        return redirect(url_for("signin", mode="login"))

    user_id = session["user_id"]
    conn = get_db_connection()
    user = conn.execute(
        "SELECT consent_given, assessment_completed FROM users WHERE id = ?",
        (user_id,),
    ).fetchone()

    if user is None:
        conn.close()
        session.clear()
        flash("Account session is invalid. Please sign in again.", "error")
        return redirect(url_for("signin", mode="login"))

    if request.method == "POST":
        agreed = 1 if request.form.get("consent_agree") == "on" else 0
        if agreed != 1:
            conn.close()
            flash("Please agree to consent before continuing.", "error")
            return render_template("consent.html")

        conn.execute("UPDATE users SET consent_given = 1 WHERE id = ?", (user_id,))
        conn.commit()
        conn.close()
        flash("Consent saved. Continue to assessments.", "success")
        return redirect(url_for("assessments"))

    if user["consent_given"] == 1:
        conn.close()
        if user["assessment_completed"] == 1:
            return redirect(url_for("dashboard"))
        return redirect(url_for("assessments"))

    conn.close()
    return render_template("consent.html")


@app.route("/assessments")
def assessments():
    if "user_id" not in session:
        flash("Please sign in first.", "error")
        return redirect(url_for("signin", mode="login"))

    conn = get_db_connection()
    user = conn.execute(
        "SELECT consent_given, assessment_completed FROM users WHERE id = ?",
        (session["user_id"],),
    ).fetchone()
    conn.close()

    if user is None:
        session.clear()
        flash("Account session is invalid. Please sign in again.", "error")
        return redirect(url_for("signin", mode="login"))

    if user["consent_given"] != 1:
        flash("Please complete consent first.", "error")
        return redirect(url_for("consent"))

    if user["assessment_completed"] == 1:
        return redirect(url_for("dashboard"))

    return render_template("assessments.html")


@app.route("/result")
def result():
    if "user_id" not in session:
        flash("Please sign in first.", "error")
        return redirect(url_for("signin", mode="login"))

    conn = get_db_connection()
    conn.execute("UPDATE users SET assessment_completed = 1 WHERE id = ?", (session["user_id"],))
    log_user_event(conn, session["user_id"], "assessment_completed", {"route": "/result"})
    conn.commit()
    conn.close()

    return render_template("result.html")


def require_assessment_user():
    user_id = session.get("user_id")
    if not user_id:
        return None, None, (jsonify({"ok": False, "message": "Please sign in first."}), 401)

    conn = get_db_connection()
    user_row = get_user_row(conn, user_id)
    if user_row is None:
        conn.close()
        session.clear()
        return None, None, (jsonify({"ok": False, "message": "Account session is invalid."}), 401)

    if user_row["consent_given"] != 1:
        conn.close()
        return None, None, (jsonify({"ok": False, "message": "Please complete consent first."}), 403)

    return conn, user_row, None


@app.route("/api/assessments/submit", methods=["POST"])
def submit_assessment():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"ok": False, "message": "Please sign in first."}), 401

    conn = get_db_connection()
    user_row = get_user_row(conn, user_id)
    if user_row is None:
        conn.close()
        session.clear()
        return jsonify({"ok": False, "message": "Account session is invalid."}), 401

    if user_row["consent_given"] != 1:
        conn.close()
        return jsonify({"ok": False, "message": "Please complete consent first."}), 403

    try:
        data = request.get_json(silent=True) or {}

        try:
            total_answered = max(0, int(data.get("totalAnswered") or 0))
        except (TypeError, ValueError):
            total_answered = 0

        try:
            total_skipped = max(0, int(data.get("totalSkipped") or 0))
        except (TypeError, ValueError):
            total_skipped = 0
        dominant_emotion = str(data.get("dominantEmotion") or "").strip() or None
        severity = str(data.get("severity") or "").strip() or None
        secondary_emotion = str(data.get("secondaryEmotion") or "").strip() or None

        raw_scores = data.get("emotionScores")
        emotion_scores = {}
        if isinstance(raw_scores, dict):
            for key, value in raw_scores.items():
                label = str(key).strip()
                if not label:
                    continue
                try:
                    emotion_scores[label] = float(value)
                except (TypeError, ValueError):
                    emotion_scores[label] = 0.0

        raw_history = data.get("history")
        history = []
        if isinstance(raw_history, list):
            for item in raw_history[:80]:
                if not isinstance(item, dict):
                    continue
                raw_score = item.get("scoreAdded")
                try:
                    score_added = float(raw_score)
                except (TypeError, ValueError):
                    score_added = 0.0

                history.append(
                    {
                        "questionId": str(item.get("questionId") or "").strip(),
                        "emotion": str(item.get("emotion") or "").strip(),
                        "selectedOption": str(item.get("selectedOption") or "").strip(),
                        "scoreAdded": score_added,
                        "intensity": item.get("intensity"),
                        "skipped": bool(item.get("skipped")),
                    }
                )

        generated_at = str(data.get("generatedAt") or "").strip() or (datetime.utcnow().isoformat() + "Z")

        payload = {
            "totalAnswered": total_answered,
            "totalSkipped": total_skipped,
            "dominantEmotion": dominant_emotion,
            "secondaryEmotion": secondary_emotion,
            "severity": severity,
            "emotionScores": emotion_scores,
            "history": history,
            "generatedAt": generated_at,
        }

        cursor = conn.execute(
            """
            INSERT INTO assessment_sessions (
                user_id, dominant_emotion, severity, total_answered, total_skipped, result_payload
            )
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                user_row["id"],
                dominant_emotion,
                severity,
                total_answered,
                total_skipped,
                safe_json_dumps(payload),
            ),
        )
        conn.execute("UPDATE users SET assessment_completed = 1 WHERE id = ?", (user_row["id"],))
        log_user_event(
            conn,
            user_row["id"],
            "assessment_submitted",
            {
                "assessment_id": cursor.lastrowid,
                "dominant_emotion": dominant_emotion,
                "severity": severity,
                "total_answered": total_answered,
                "total_skipped": total_skipped,
            },
        )
        conn.commit()

        return jsonify({"ok": True, "assessment_id": cursor.lastrowid})
    finally:
        conn.close()


def require_authenticated_page_user():
    if "user_id" not in session:
        flash("Please log in first.", "error")
        return None, None, redirect(url_for("signin", mode="login"))

    conn = get_db_connection()
    user = get_user_row(conn, session["user_id"])

    if user is None:
        conn.close()
        session.clear()
        flash("Account session is invalid. Please sign in again.", "error")
        return None, None, redirect(url_for("signin", mode="login"))

    if user["consent_given"] != 1:
        conn.close()
        return None, None, redirect(url_for("consent"))

    if user["assessment_completed"] != 1:
        conn.close()
        return None, None, redirect(url_for("assessments"))

    return conn, user, None


@app.route("/knowyourself")
def know_yourself():
    conn, user, redirect_response = require_authenticated_page_user()
    if redirect_response:
        return redirect_response

    log_user_event(conn, user["id"], "know_yourself_page_view", {"route": "/knowyourself"})
    conn.commit()
    page_context = build_shell_context(user, "know_yourself")
    conn.close()
    return render_template("knowyourself.html", **page_context)


def require_know_yourself_user():
    conn, user_row, error = require_dashboard_api_user()
    if error:
        return None, None, error
    return conn, user_row, None


@app.route("/api/knowyourself/bootstrap")
def know_yourself_bootstrap():
    conn, user_row, error = require_know_yourself_user()
    if error:
        return error

    try:
        _, trait_counts = sync_know_yourself_question_bank(conn)

        traits = []
        for trait_name, count in sorted(trait_counts.items(), key=lambda item: item[0].lower()):
            traits.append(
                {
                    "trait": trait_name,
                    "trait_group": classify_trait_group(trait_name),
                    "question_count": int(count),
                }
            )

        latest_result = get_latest_know_yourself_result(conn, user_row["id"])
        log_user_event(conn, user_row["id"], "know_yourself_bootstrap", {"route": "/api/knowyourself/bootstrap"})
        conn.commit()

        return jsonify(
            {
                "ok": True,
                "username": user_row["full_name"] or user_row["username"],
                "traits": traits,
                "total_traits": len(traits),
                "target_questions_per_trait": KNOW_YOURSELF_QUESTIONS_PER_TRAIT,
                "target_total_questions": sum(
                    min(KNOW_YOURSELF_QUESTIONS_PER_TRAIT, item["question_count"]) for item in traits
                ),
                "latest_result": latest_result,
            }
        )
    except ValueError as exc:
        conn.rollback()
        return jsonify({"ok": False, "message": str(exc)}), 400
    finally:
        conn.close()


@app.route("/api/knowyourself/start", methods=["POST"])
def know_yourself_start():
    conn, user_row, error = require_know_yourself_user()
    if error:
        return error

    try:
        sync_know_yourself_question_bank(conn)
        question_bank = get_active_know_yourself_questions(conn)
        selected_questions = build_know_yourself_question_order(question_bank)
        question_order = [item["question_uid"] for item in selected_questions]

        cursor = conn.execute(
            """
            INSERT INTO know_yourself_sessions (user_id, status, total_questions, question_order_json)
            VALUES (?, 'in_progress', ?, ?)
            """,
            (
                user_row["id"],
                len(question_order),
                safe_json_dumps(question_order),
            ),
        )
        session_id = int(cursor.lastrowid)
        first_question = serialize_know_yourself_question(selected_questions[0]) if selected_questions else None

        log_user_event(
            conn,
            user_row["id"],
            "know_yourself_session_started",
            {
                "session_id": session_id,
                "total_questions": len(question_order),
            },
        )
        conn.commit()

        return jsonify(
            {
                "ok": True,
                "session": {
                    "id": session_id,
                    "total_questions": len(question_order),
                    "answered_count": 0,
                    "progress_percent": 0,
                },
                "current_question": first_question,
            }
        )
    except ValueError as exc:
        conn.rollback()
        return jsonify({"ok": False, "message": str(exc)}), 400
    finally:
        conn.close()


@app.route("/api/knowyourself/answer", methods=["POST"])
def know_yourself_answer():
    conn, user_row, error = require_know_yourself_user()
    if error:
        return error

    try:
        data = request.get_json(silent=True) or {}
        try:
            session_id = int(data.get("session_id"))
        except (TypeError, ValueError):
            return jsonify({"ok": False, "message": "Invalid session."}), 400

        question_id = str(data.get("question_id") or "").strip()
        selected_option = str(data.get("selected_option") or "").strip().upper()

        if selected_option not in OPTION_ORDER:
            return jsonify({"ok": False, "message": "Please choose a valid option."}), 400

        session_row = get_know_yourself_session_row(conn, user_row["id"], session_id)
        if session_row is None:
            return jsonify({"ok": False, "message": "Assessment session not found."}), 404
        if session_row["status"] != "in_progress":
            return jsonify({"ok": False, "message": "This assessment session is already completed."}), 409

        try:
            question_order = json.loads(session_row["question_order_json"] or "[]")
        except (TypeError, ValueError):
            question_order = []

        if question_id not in question_order:
            return jsonify({"ok": False, "message": "Question does not belong to this session."}), 400

        question_bank = get_active_know_yourself_questions(conn)
        questions_by_id = {item["question_uid"]: item for item in question_bank}
        question = questions_by_id.get(question_id)
        if question is None:
            return jsonify({"ok": False, "message": "Question is unavailable. Please restart."}), 409

        options_by_key = {str(opt.get("key")): str(opt.get("text") or "") for opt in question.get("options", [])}
        selected_option_text = options_by_key.get(selected_option)
        if not selected_option_text:
            return jsonify({"ok": False, "message": "Invalid option selected."}), 400

        score = map_option_to_score(selected_option)
        conn.execute(
            """
            INSERT INTO know_yourself_responses (
                session_id, user_id, question_uid, trait_name, selected_option, selected_option_text, score
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(session_id, question_uid) DO UPDATE SET
                selected_option = excluded.selected_option,
                selected_option_text = excluded.selected_option_text,
                score = excluded.score,
                answered_at = CURRENT_TIMESTAMP
            """,
            (
                session_id,
                user_row["id"],
                question_id,
                question["trait_name"],
                selected_option,
                selected_option_text,
                score,
            ),
        )

        response_rows = get_know_yourself_response_rows(conn, session_id)
        answered_ids = {row["question_uid"] for row in response_rows}
        total_questions = len(question_order)
        answered_count = len(answered_ids)

        next_question = None
        for candidate_id in question_order:
            if candidate_id not in answered_ids:
                candidate = questions_by_id.get(candidate_id)
                if candidate is not None:
                    next_question = serialize_know_yourself_question(candidate)
                break

        log_user_event(
            conn,
            user_row["id"],
            "know_yourself_answer_recorded",
            {
                "session_id": session_id,
                "question_id": question_id,
                "trait": question["trait_name"],
                "selected_option": selected_option,
                "score": score,
            },
        )
        conn.commit()

        return jsonify(
            {
                "ok": True,
                "session": {
                    "id": session_id,
                    "total_questions": total_questions,
                    "answered_count": answered_count,
                    "progress_percent": round((answered_count / total_questions) * 100, 2)
                    if total_questions
                    else 0,
                    "is_complete": answered_count >= total_questions,
                },
                "next_question": next_question,
            }
        )
    finally:
        conn.close()


@app.route("/api/knowyourself/submit", methods=["POST"])
def know_yourself_submit():
    conn, user_row, error = require_know_yourself_user()
    if error:
        return error

    try:
        data = request.get_json(silent=True) or {}
        try:
            session_id = int(data.get("session_id"))
        except (TypeError, ValueError):
            return jsonify({"ok": False, "message": "Invalid session."}), 400

        session_row = get_know_yourself_session_row(conn, user_row["id"], session_id)
        if session_row is None:
            return jsonify({"ok": False, "message": "Assessment session not found."}), 404

        try:
            question_order = json.loads(session_row["question_order_json"] or "[]")
        except (TypeError, ValueError):
            question_order = []

        if not question_order:
            return jsonify({"ok": False, "message": "Session has no questions. Please restart."}), 409

        response_rows = get_know_yourself_response_rows(conn, session_id)
        if len(response_rows) < len(question_order):
            return jsonify(
                {
                    "ok": False,
                    "message": f"Please answer all questions before submitting ({len(response_rows)}/{len(question_order)}).",
                }
            ), 409

        placeholders = ",".join(["?"] * len(question_order))
        rows = conn.execute(
            f"""
            SELECT
                question_uid,
                trait_name,
                trait_group,
                question_number,
                question_text,
                options_json,
                source_order
            FROM know_yourself_questions
            WHERE question_uid IN ({placeholders})
            """,
            question_order,
        ).fetchall()

        questions_by_id = {}
        for row in rows:
            try:
                options = json.loads(row["options_json"] or "[]")
            except (TypeError, ValueError):
                options = []
            questions_by_id[row["question_uid"]] = {
                "question_uid": row["question_uid"],
                "trait_name": row["trait_name"],
                "trait_group": row["trait_group"],
                "question_number": int(row["question_number"] or 0),
                "question_text": row["question_text"],
                "options": options,
                "source_order": int(row["source_order"] or 0),
            }

        session_question_bank = [questions_by_id[qid] for qid in question_order if qid in questions_by_id]
        if len(session_question_bank) != len(question_order):
            return jsonify(
                {
                    "ok": False,
                    "message": "Question bank changed during session. Please restart the assessment.",
                }
            ), 409

        result_payload = build_know_yourself_result_payload(session_question_bank, response_rows, session_id)
        summary = result_payload["summary"]
        personality = result_payload["personality"]
        insights = result_payload["insights"]

        conn.execute("DELETE FROM know_yourself_trait_scores WHERE session_id = ?", (session_id,))
        for trait_item in result_payload["trait_scores"]:
            conn.execute(
                """
                INSERT INTO know_yourself_trait_scores (
                    session_id, user_id, trait_name, trait_group, raw_average, score_percent, answered_count
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    session_id,
                    user_row["id"],
                    trait_item["trait"],
                    trait_item["trait_group"],
                    trait_item["raw_average"],
                    trait_item["score_percent"],
                    trait_item["question_count"],
                ),
            )

        conn.execute(
            """
            UPDATE know_yourself_sessions
            SET status = 'completed', completed_at = CURRENT_TIMESTAMP, result_payload = ?
            WHERE id = ? AND user_id = ?
            """,
            (safe_json_dumps(result_payload), session_id, user_row["id"]),
        )

        conn.execute(
            """
            INSERT INTO know_yourself_results (
                session_id, user_id, positive_score, negative_score, final_label,
                personality_title, personality_description, insights_json, result_payload
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(session_id) DO UPDATE SET
                positive_score = excluded.positive_score,
                negative_score = excluded.negative_score,
                final_label = excluded.final_label,
                personality_title = excluded.personality_title,
                personality_description = excluded.personality_description,
                insights_json = excluded.insights_json,
                result_payload = excluded.result_payload
            """,
            (
                session_id,
                user_row["id"],
                summary["positive_score"],
                summary["negative_score"],
                summary["final_label"],
                personality["title"],
                personality["description"],
                safe_json_dumps(insights),
                safe_json_dumps(result_payload),
            ),
        )

        conn.execute("UPDATE users SET assessment_completed = 1 WHERE id = ?", (user_row["id"],))

        log_user_event(
            conn,
            user_row["id"],
            "know_yourself_submitted",
            {
                "session_id": session_id,
                "final_label": summary["final_label"],
                "positive_score": summary["positive_score"],
                "negative_score": summary["negative_score"],
            },
        )
        conn.commit()

        return jsonify({"ok": True, "result": result_payload})
    finally:
        conn.close()


@app.route("/dashboard")
def dashboard():
    conn, user, redirect_response = require_authenticated_page_user()
    if redirect_response:
        return redirect_response

    ensure_login_activity(conn, user["id"])
    log_user_event(conn, user["id"], "dashboard_page_view", {"route": "/dashboard"})
    conn.commit()
    page_context = build_shell_context(user, "milestones")
    conn.close()
    return render_template("dashboard.html", **page_context)


@app.route("/journal")
def journal():
    conn, user, redirect_response = require_authenticated_page_user()
    if redirect_response:
        return redirect_response

    ensure_login_activity(conn, user["id"])
    log_user_event(conn, user["id"], "journal_page_view", {"route": "/journal"})
    conn.commit()
    page_context = build_shell_context(user, "journal")
    conn.close()
    return render_template("journal.html", **page_context)


@app.route("/games")
def games():
    conn, user, redirect_response = require_authenticated_page_user()
    if redirect_response:
        return redirect_response

    ensure_login_activity(conn, user["id"])
    log_user_event(conn, user["id"], "games_page_view", {"route": "/games"})
    conn.commit()
    page_context = build_shell_context(user, "games")
    conn.close()
    return render_template("games.html", **page_context)


@app.route("/support")
def support():
    conn, user, redirect_response = require_authenticated_page_user()
    if redirect_response:
        return redirect_response

    ensure_login_activity(conn, user["id"])
    log_user_event(conn, user["id"], "support_page_view", {"route": "/support"})
    conn.commit()
    page_context = build_shell_context(user, "support")
    conn.close()
    return render_template("support.html", **page_context)


@app.route("/developers")
def developers():
    conn, user, redirect_response = require_authenticated_page_user()
    if redirect_response:
        return redirect_response

    ensure_login_activity(conn, user["id"])
    log_user_event(conn, user["id"], "developers_page_view", {"route": "/developers"})
    conn.commit()
    page_context = build_shell_context(user, "developers")
    conn.close()
    return render_template("developers.html", **page_context)


@app.route("/settings")
def settings():
    conn, user, redirect_response = require_authenticated_page_user()
    if redirect_response:
        return redirect_response

    ensure_login_activity(conn, user["id"])
    log_user_event(conn, user["id"], "settings_page_view", {"route": "/settings"})
    conn.commit()

    page_context = build_shell_context(user, "settings")
    profile = {
        "full_name": build_display_name(user["full_name"], user["username"]),
        "username": str(user["username"] or ""),
        "email": str(user["email"] or ""),
        "phone_number": str(user["phone_number"] or ""),
        "joined_at": str(user["created_at"] or ""),
        "profile_image_url": build_profile_image_url(user["profile_image_path"]),
    }
    intelligence = build_settings_intelligence(conn, user["id"])
    conn.close()
    return render_template("settings.html", profile=profile, intelligence=intelligence, **page_context)


@app.route("/api/journal/bootstrap")
def journal_bootstrap():
    conn, user_row, error = require_dashboard_api_user()
    if error:
        return error

    try:
        payload = build_journal_payload(conn, user_row)
        log_user_event(conn, user_row["id"], "journal_bootstrap", {"route": "/api/journal/bootstrap"})
        conn.commit()
        return jsonify(payload)
    finally:
        conn.close()


@app.route("/api/journal/ai-consent", methods=["PATCH"])
def journal_update_ai_consent():
    conn, user_row, error = require_dashboard_api_user()
    if error:
        return error

    try:
        data = request.get_json(silent=True) or {}
        allow = parse_bool(data.get("allow"), fallback=None)
        if allow is None:
            return jsonify({"ok": False, "message": "Invalid consent choice."}), 400

        allow_int = 1 if allow else 0
        conn.execute(
            "UPDATE users SET journal_ai_share_enabled = ? WHERE id = ?",
            (allow_int, user_row["id"]),
        )
        conn.execute(
            "UPDATE journal_entries SET share_with_ai = ? WHERE user_id = ?",
            (allow_int, user_row["id"]),
        )

        log_user_event(
            conn,
            user_row["id"],
            "journal_ai_consent_updated",
            {"allow": bool(allow_int)},
        )

        payload = build_journal_payload(conn, get_user_row(conn, user_row["id"]))
        conn.commit()
        return jsonify({"ok": True, "message": "Preference updated.", "journal": payload})
    finally:
        conn.close()


@app.route("/api/journal", methods=["POST"])
def journal_create_entry():
    conn, user_row, error = require_dashboard_api_user()
    if error:
        return error

    try:
        data = request.get_json(silent=True) or {}
        title = normalize_journal_title(data.get("title"))
        content = normalize_journal_content(data.get("content"))

        share = bool(user_row["journal_ai_share_enabled"]) if user_row["journal_ai_share_enabled"] is not None else False

        cursor = conn.execute(
            """
            INSERT INTO journal_entries (user_id, title, content, share_with_ai)
            VALUES (?, ?, ?, ?)
            """,
            (user_row["id"], title, content, 1 if share else 0),
        )

        entry = get_journal_entry_row(conn, user_row["id"], cursor.lastrowid)

        log_user_event(
            conn,
            user_row["id"],
            "journal_entry_created",
            {"entry_id": cursor.lastrowid, "title_length": len(title), "content_length": len(content)},
        )
        conn.commit()

        return jsonify({"ok": True, "entry": serialize_journal_row(entry, include_content=True)})
    finally:
        conn.close()


@app.route("/api/journal/<int:entry_id>", methods=["PATCH"])
def journal_update_entry(entry_id):
    conn, user_row, error = require_dashboard_api_user()
    if error:
        return error

    try:
        existing = get_journal_entry_row(conn, user_row["id"], entry_id)

        if existing is None:
            return jsonify({"ok": False, "message": "Journal entry not found."}), 404

        data = request.get_json(silent=True) or {}

        if bool(existing["is_locked"]):
            if not validate_journal_entry_pin(existing, data.get("pin")):
                return jsonify({"ok": False, "message": "Valid 4-digit pin required for this locked note."}), 403

        title = normalize_journal_title(data.get("title", existing["title"]))
        content = normalize_journal_content(data.get("content", existing["content"]))

        share = bool(user_row["journal_ai_share_enabled"]) if user_row["journal_ai_share_enabled"] is not None else False

        conn.execute(
            """
            UPDATE journal_entries
            SET title = ?, content = ?, share_with_ai = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?
            """,
            (title, content, 1 if share else 0, entry_id, user_row["id"]),
        )

        updated = get_journal_entry_row(conn, user_row["id"], entry_id)

        log_user_event(
            conn,
            user_row["id"],
            "journal_entry_updated",
            {"entry_id": entry_id, "title_length": len(title), "content_length": len(content)},
        )
        conn.commit()

        return jsonify({"ok": True, "entry": serialize_journal_row(updated, include_content=True)})
    finally:
        conn.close()


@app.route("/api/journal/<int:entry_id>", methods=["DELETE"])
def journal_delete_entry(entry_id):
    conn, user_row, error = require_dashboard_api_user()
    if error:
        return error

    try:
        existing = get_journal_entry_row(conn, user_row["id"], entry_id)

        if existing is None:
            return jsonify({"ok": False, "message": "Journal entry not found."}), 404

        data = request.get_json(silent=True) or {}
        if bool(existing["is_locked"]):
            if not validate_journal_entry_pin(existing, data.get("pin")):
                return jsonify({"ok": False, "message": "Valid 4-digit pin required to delete this locked note."}), 403

        conn.execute(
            """
            INSERT INTO journal_deleted_entries (
                original_entry_id,
                user_id,
                owner_username,
                owner_name,
                title,
                content,
                share_with_ai,
                is_locked,
                lock_pin_hash,
                original_created_at,
                original_updated_at,
                deleted_by_user_id,
                ai_access_blocked
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            """,
            (
                existing["id"],
                existing["user_id"],
                str(existing["owner_username"] or ""),
                str(existing["owner_full_name"] or existing["owner_username"] or ""),
                str(existing["title"] or ""),
                str(existing["content"] or ""),
                1 if bool(existing["share_with_ai"]) else 0,
                1 if bool(existing["is_locked"]) else 0,
                str(existing["lock_pin_hash"] or ""),
                str(existing["created_at"] or ""),
                str(existing["updated_at"] or ""),
                user_row["id"],
            ),
        )

        conn.execute(
            "DELETE FROM journal_entries WHERE id = ? AND user_id = ?",
            (entry_id, user_row["id"]),
        )

        log_user_event(
            conn,
            user_row["id"],
            "journal_entry_deleted",
            {"entry_id": entry_id, "title": str(existing["title"] or "")[:160]},
        )
        conn.commit()

        return jsonify({"ok": True, "deleted_id": entry_id})
    finally:
        conn.close()


@app.route("/api/journal/<int:entry_id>/lock", methods=["PATCH"])
def journal_lock_entry(entry_id):
    conn, user_row, error = require_dashboard_api_user()
    if error:
        return error

    try:
        entry = get_journal_entry_row(conn, user_row["id"], entry_id)
        if entry is None:
            return jsonify({"ok": False, "message": "Journal entry not found."}), 404

        data = request.get_json(silent=True) or {}
        new_pin = normalize_journal_pin(data.get("pin"))
        if new_pin is None:
            return jsonify({"ok": False, "message": "Pin must be exactly 4 digits."}), 400

        # If already locked, require current pin before changing lock pin.
        if bool(entry["is_locked"]):
            if not validate_journal_entry_pin(entry, data.get("current_pin")):
                return jsonify({"ok": False, "message": "Current 4-digit pin is required."}), 403

        pin_hash = generate_password_hash(new_pin, method="pbkdf2:sha256")
        conn.execute(
            """
            UPDATE journal_entries
            SET is_locked = 1, lock_pin_hash = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?
            """,
            (pin_hash, entry_id, user_row["id"]),
        )

        updated = get_journal_entry_row(conn, user_row["id"], entry_id)
        log_user_event(
            conn,
            user_row["id"],
            "journal_entry_locked",
            {"entry_id": entry_id, "pin_changed": bool(entry["is_locked"])},
        )
        conn.commit()

        return jsonify({"ok": True, "entry": serialize_journal_row(updated, include_content=False)})
    finally:
        conn.close()


@app.route("/api/journal/<int:entry_id>/unlock", methods=["POST"])
def journal_unlock_entry(entry_id):
    conn, user_row, error = require_dashboard_api_user()
    if error:
        return error

    try:
        entry = get_journal_entry_row(conn, user_row["id"], entry_id)
        if entry is None:
            return jsonify({"ok": False, "message": "Journal entry not found."}), 404

        if not bool(entry["is_locked"]):
            return jsonify({"ok": True, "entry": serialize_journal_row(entry, include_content=True)})

        data = request.get_json(silent=True) or {}
        if not validate_journal_entry_pin(entry, data.get("pin")):
            return jsonify({"ok": False, "message": "Incorrect 4-digit pin."}), 403

        log_user_event(
            conn,
            user_row["id"],
            "journal_entry_unlocked",
            {"entry_id": entry_id},
        )
        conn.commit()

        refreshed = get_journal_entry_row(conn, user_row["id"], entry_id)
        return jsonify({"ok": True, "entry": serialize_journal_row(refreshed, include_content=True)})
    finally:
        conn.close()


@app.route("/api/journal/<int:entry_id>/remove-lock", methods=["PATCH"])
def journal_remove_lock(entry_id):
    conn, user_row, error = require_dashboard_api_user()
    if error:
        return error

    try:
        entry = get_journal_entry_row(conn, user_row["id"], entry_id)
        if entry is None:
            return jsonify({"ok": False, "message": "Journal entry not found."}), 404

        if not bool(entry["is_locked"]):
            return jsonify({"ok": False, "message": "This note is not locked."}), 400

        data = request.get_json(silent=True) or {}
        if not validate_journal_entry_pin(entry, data.get("current_pin")):
            return jsonify({"ok": False, "message": "Current 4-digit pin is required."}), 403

        conn.execute(
            """
            UPDATE journal_entries
            SET is_locked = 0, lock_pin_hash = NULL, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?
            """,
            (entry_id, user_row["id"]),
        )

        updated = get_journal_entry_row(conn, user_row["id"], entry_id)
        log_user_event(
            conn,
            user_row["id"],
            "journal_entry_lock_removed",
            {"entry_id": entry_id},
        )
        conn.commit()

        return jsonify({"ok": True, "entry": serialize_journal_row(updated, include_content=True)})
    finally:
        conn.close()


@app.route("/api/journal/<int:entry_id>/reset-pin", methods=["PATCH"])
def journal_reset_pin_with_password(entry_id):
    conn, user_row, error = require_dashboard_api_user()
    if error:
        return error

    try:
        entry = get_journal_entry_row(conn, user_row["id"], entry_id)
        if entry is None:
            return jsonify({"ok": False, "message": "Journal entry not found."}), 404

        if not bool(entry["is_locked"]):
            return jsonify({"ok": False, "message": "This note is not locked."}), 400

        data = request.get_json(silent=True) or {}
        login_password = str(data.get("login_password") or "")
        new_pin = normalize_journal_pin(data.get("new_pin"))

        if len(login_password) < 1:
            return jsonify({"ok": False, "message": "Login password is required."}), 400
        if new_pin is None:
            return jsonify({"ok": False, "message": "New PIN must be exactly 4 digits."}), 400

        password_hash = get_user_password_hash(conn, user_row["id"])
        if not password_hash or not check_password_hash(password_hash, login_password):
            return jsonify({"ok": False, "message": "Incorrect login password."}), 403

        pin_hash = generate_password_hash(new_pin, method="pbkdf2:sha256")
        conn.execute(
            """
            UPDATE journal_entries
            SET is_locked = 1, lock_pin_hash = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?
            """,
            (pin_hash, entry_id, user_row["id"]),
        )

        updated = get_journal_entry_row(conn, user_row["id"], entry_id)
        log_user_event(
            conn,
            user_row["id"],
            "journal_entry_pin_reset_with_password",
            {"entry_id": entry_id},
        )
        conn.commit()

        return jsonify({"ok": True, "entry": serialize_journal_row(updated, include_content=False)})
    finally:
        conn.close()


@app.route("/api/settings/profile-image", methods=["POST"])
def settings_upload_profile_image():
    conn, user_row, error = require_dashboard_api_user()
    if error:
        return error

    try:
        image_file = request.files.get("image")
        if image_file is None or not str(image_file.filename or "").strip():
            return jsonify({"ok": False, "message": "Please choose an image file."}), 400

        safe_name = secure_filename(str(image_file.filename or ""))
        extension = get_file_extension(safe_name)
        if extension not in PROFILE_IMAGE_ALLOWED_EXTENSIONS:
            allowed = ", ".join(sorted(PROFILE_IMAGE_ALLOWED_EXTENSIONS))
            return jsonify({"ok": False, "message": f"Allowed formats: {allowed}."}), 400

        image_file.stream.seek(0, os.SEEK_END)
        file_size = image_file.stream.tell()
        image_file.stream.seek(0)
        if file_size > PROFILE_IMAGE_MAX_BYTES:
            return jsonify({"ok": False, "message": "Image is too large. Max size is 5MB."}), 400

        os.makedirs(PROFILE_IMAGE_UPLOAD_DIR, exist_ok=True)
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S%f")
        file_name = f"user_{user_row['id']}_{timestamp}.{extension}"
        absolute_path = os.path.join(PROFILE_IMAGE_UPLOAD_DIR, file_name)
        image_file.save(absolute_path)

        relative_path = os.path.join(PROFILE_IMAGE_UPLOAD_RELATIVE_DIR, file_name).replace("\\", "/")
        old_relative = normalize_profile_image_path(user_row["profile_image_path"])

        conn.execute(
            "UPDATE users SET profile_image_path = ? WHERE id = ?",
            (relative_path, user_row["id"]),
        )
        log_user_event(
            conn,
            user_row["id"],
            "settings_profile_image_updated",
            {"relative_path": relative_path},
        )
        conn.commit()

        if (
            old_relative
            and old_relative != relative_path
            and old_relative.startswith(PROFILE_IMAGE_UPLOAD_RELATIVE_DIR.replace("\\", "/"))
        ):
            old_abs = os.path.join(PROJECT_ROOT, "static", old_relative)
            try:
                if os.path.isfile(old_abs):
                    os.remove(old_abs)
            except OSError:
                pass

        return jsonify(
            {
                "ok": True,
                "message": "Profile image updated.",
                "profile_image_url": build_profile_image_url(relative_path),
            }
        )
    finally:
        conn.close()


@app.route("/api/settings/reset", methods=["POST"])
def settings_reset_all_inputs():
    conn, user_row, error = require_dashboard_api_user()
    if error:
        return error

    try:
        data = request.get_json(silent=True) or {}
        confirm_text = str(data.get("confirm_text") or "").strip().upper()
        if confirm_text != "RESET":
            return jsonify({"ok": False, "message": "Type RESET to confirm."}), 400

        user_id = int(user_row["id"])

        conn.execute("DELETE FROM know_yourself_responses WHERE user_id = ?", (user_id,))
        conn.execute("DELETE FROM know_yourself_trait_scores WHERE user_id = ?", (user_id,))
        conn.execute("DELETE FROM know_yourself_results WHERE user_id = ?", (user_id,))
        conn.execute("DELETE FROM know_yourself_sessions WHERE user_id = ?", (user_id,))

        conn.execute("DELETE FROM assessment_sessions WHERE user_id = ?", (user_id,))
        conn.execute("DELETE FROM reflection_entries WHERE user_id = ?", (user_id,))
        conn.execute("DELETE FROM micro_goals WHERE user_id = ?", (user_id,))
        conn.execute("DELETE FROM user_mood_checkins WHERE user_id = ?", (user_id,))
        conn.execute("DELETE FROM user_login_activity WHERE user_id = ?", (user_id,))
        conn.execute("DELETE FROM journal_entries WHERE user_id = ?", (user_id,))
        conn.execute("DELETE FROM journal_deleted_entries WHERE user_id = ? OR deleted_by_user_id = ?", (user_id, user_id))
        conn.execute("DELETE FROM user_events WHERE user_id = ?", (user_id,))

        conn.execute("UPDATE users SET journal_ai_share_enabled = NULL WHERE id = ?", (user_id,))

        log_user_event(conn, user_id, "settings_reset_completed", {"mode": "full_reset"})
        conn.commit()

        return jsonify(
            {
                "ok": True,
                "message": "All activity inputs were reset. Emotional stability will restart from zero.",
            }
        )
    finally:
        conn.close()


@app.route("/api/dashboard/bootstrap")
def dashboard_bootstrap():
    conn, user_row, error = require_dashboard_api_user()
    if error:
        return error

    try:
        ensure_login_activity(conn, user_row["id"])
        log_user_event(conn, user_row["id"], "dashboard_bootstrap", {"route": "/api/dashboard/bootstrap"})

        payload = build_dashboard_payload(conn, user_row)
        conn.commit()
        return jsonify(payload)
    finally:
        conn.close()


@app.route("/api/dashboard/mood", methods=["POST"])
def dashboard_set_mood():
    conn, user_row, error = require_dashboard_api_user()
    if error:
        return error

    try:
        data = request.get_json(silent=True) or {}
        mood = normalize_mood(data.get("mood"))

        if mood is None:
            return (
                jsonify(
                    {
                        "ok": False,
                        "message": "Invalid mood value.",
                        "allowed": list(MOOD_CHOICES),
                    }
                ),
                400,
            )

        today = iso_day(current_local_date())
        existing = conn.execute(
            """
            SELECT id, mood
            FROM user_mood_checkins
            WHERE user_id = ? AND checkin_date = ?
            LIMIT 1
            """,
            (user_row["id"], today),
        ).fetchone()

        if existing:
            payload = build_dashboard_payload(conn, user_row)
            conn.commit()
            return (
                jsonify(
                    {
                        "ok": False,
                        "message": "Today's emotional state is already recorded.",
                        "dashboard": payload,
                    }
                ),
                409,
            )

        conn.execute(
            """
            INSERT INTO user_mood_checkins (user_id, mood, checkin_date)
            VALUES (?, ?, ?)
            """,
            (user_row["id"], mood, today),
        )

        log_user_event(conn, user_row["id"], "mood_selected", {"mood": mood, "date": today})
        payload = build_dashboard_payload(conn, user_row)
        conn.commit()

        return jsonify({"ok": True, "message": "Mood saved.", "dashboard": payload})
    finally:
        conn.close()


@app.route("/api/dashboard/goals", methods=["POST"])
def dashboard_add_goal():
    conn, user_row, error = require_dashboard_api_user()
    if error:
        return error

    try:
        data = request.get_json(silent=True) or {}
        goal_text = str(data.get("text", "")).strip()

        if len(goal_text) < 2:
            return jsonify({"ok": False, "message": "Goal text is too short."}), 400

        if len(goal_text) > 180:
            return jsonify({"ok": False, "message": "Goal text is too long."}), 400

        conn.execute(
            """
            INSERT INTO micro_goals (user_id, goal_text)
            VALUES (?, ?)
            """,
            (user_row["id"], goal_text),
        )

        log_user_event(conn, user_row["id"], "goal_added", {"goal_text": goal_text})
        payload = build_dashboard_payload(conn, user_row)
        conn.commit()

        return jsonify({"ok": True, "message": "Goal added.", "dashboard": payload})
    finally:
        conn.close()


@app.route("/api/dashboard/goals/<int:goal_id>", methods=["PATCH"])
def dashboard_toggle_goal(goal_id):
    conn, user_row, error = require_dashboard_api_user()
    if error:
        return error

    try:
        goal = conn.execute(
            """
            SELECT id, is_done, goal_text
            FROM micro_goals
            WHERE id = ? AND user_id = ?
            LIMIT 1
            """,
            (goal_id, user_row["id"]),
        ).fetchone()

        if goal is None:
            return jsonify({"ok": False, "message": "Goal not found."}), 404

        data = request.get_json(silent=True) or {}
        requested = parse_bool(data.get("is_done"), fallback=None)
        if requested is None:
            new_done = 0 if goal["is_done"] else 1
        else:
            new_done = 1 if requested else 0

        completed_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S") if new_done else None

        conn.execute(
            """
            UPDATE micro_goals
            SET is_done = ?, completed_at = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?
            """,
            (new_done, completed_at, goal_id, user_row["id"]),
        )

        log_user_event(
            conn,
            user_row["id"],
            "goal_toggled",
            {"goal_id": goal_id, "goal_text": goal["goal_text"], "is_done": bool(new_done)},
        )

        payload = build_dashboard_payload(conn, user_row)
        conn.commit()

        return jsonify({"ok": True, "message": "Goal updated.", "dashboard": payload})
    finally:
        conn.close()


@app.route("/api/dashboard/reflection/prompt")
def dashboard_reflection_prompt():
    conn, user_row, error = require_dashboard_api_user()
    if error:
        return error

    try:
        requested_mood = normalize_mood(request.args.get("mood"))
        today_mood_row = get_today_mood_row(conn, user_row["id"])
        mood = requested_mood or (today_mood_row["mood"] if today_mood_row else None)

        prompt = build_reflection_prompt(mood, current_local_date())
        log_user_event(conn, user_row["id"], "reflection_prompt_requested", {"mood": mood})
        conn.commit()

        return jsonify({"ok": True, "mood": mood, "prompt": prompt})
    finally:
        conn.close()


@app.route("/api/dashboard/reflection", methods=["POST"])
def dashboard_save_reflection():
    conn, user_row, error = require_dashboard_api_user()
    if error:
        return error

    try:
        data = request.get_json(silent=True) or {}
        mood = normalize_mood(data.get("mood"))
        if mood is None:
            today_mood_row = get_today_mood_row(conn, user_row["id"])
            mood = today_mood_row["mood"] if today_mood_row else None

        if mood is None:
            return jsonify({"ok": False, "message": "Select today's mood before saving reflection."}), 400

        prompt = str(data.get("prompt", "")).strip()
        if not prompt:
            prompt = build_reflection_prompt(mood, current_local_date())

        answer = str(data.get("answer", "")).strip()
        if len(answer) < 2:
            return jsonify({"ok": False, "message": "Please add your reflection answer."}), 400

        conn.execute(
            """
            INSERT INTO reflection_entries (user_id, mood, prompt, answer, entry_date)
            VALUES (?, ?, ?, ?, ?)
            """,
            (user_row["id"], mood, prompt, answer, iso_day(current_local_date())),
        )

        log_user_event(
            conn,
            user_row["id"],
            "reflection_saved",
            {"mood": mood, "prompt": prompt, "answer_length": len(answer)},
        )

        payload = build_dashboard_payload(conn, user_row)
        conn.commit()

        return jsonify({"ok": True, "message": "Reflection saved successfully.", "dashboard": payload})
    finally:
        conn.close()


@app.route("/api/dashboard/event", methods=["POST"])
def dashboard_log_event():
    conn, user_row, error = require_dashboard_api_user()
    if error:
        return error

    try:
        data = request.get_json(silent=True) or {}
        action = str(data.get("action", "")).strip()
        payload = data.get("payload")

        if not action:
            return jsonify({"ok": False, "message": "Action is required."}), 400

        log_user_event(conn, user_row["id"], f"ui:{action}", payload)
        conn.commit()

        return jsonify({"ok": True})
    finally:
        conn.close()


@app.route("/api/dashboard/echo", methods=["POST"])
def dashboard_echo_chat():
    conn, user_row, error = require_dashboard_api_user()
    if error:
        return error

    try:
        data = request.get_json(silent=True) or {}
        message_text = str(data.get("message") or "").strip()
        mood = normalize_mood(data.get("mood"))

        if len(message_text) < 1:
            return jsonify({"ok": False, "message": "Message is required."}), 400
        if len(message_text) > 2000:
            return jsonify({"ok": False, "message": "Message is too long."}), 400
        today = current_local_date()
        month_start, _ = month_bounds(today)
        month_rows = get_month_mood_rows(conn, user_row["id"], month_start, today)
        stability_score = calculate_emotional_stability(conn, user_row["id"], month_rows, month_start, today)
        trend_label = get_emotional_trend_label(conn, user_row["id"])
        journal_summary = build_echo_journal_summary(conn, user_row["id"])

        guided_payload = build_echo_guided_reply(
            message_text=message_text,
            mood=mood,
            stability_score=stability_score,
            trend_label=trend_label,
            journal_summary=journal_summary,
        )
        reply = guided_payload.get("reply") or build_echo_fallback_reply(message_text, mood)
        theme = guided_payload.get("theme") or "general_reflection"

        log_user_event(
            conn,
            user_row["id"],
            "echo_chat_message",
            {
                "mood": mood,
                "user_message_length": len(message_text),
                "assistant_reply_length": len(reply),
                "used_openai": False,
                "echo_theme": theme,
                "journal_entries_considered": int(journal_summary.get("entries") or 0),
            },
        )
        conn.commit()

        return jsonify(
            {
                "ok": True,
                "reply": reply,
                "mode": "guided_reflection",
                "theme": theme,
            }
        )
    finally:
        conn.close()


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5050, debug=True)
