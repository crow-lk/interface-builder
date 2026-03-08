from __future__ import annotations

import io
import json
import os
import pickle
import re
import textwrap
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any

import h5py
import numpy as np
import pdfplumber
import pytesseract
from sklearn.feature_extraction.text import TfidfVectorizer
from docx import Document
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from PIL import Image

ALLOWED_EXTENSIONS = {"txt", "pdf", "docx", "png", "jpg", "jpeg"}

ROOT_DIR = Path(__file__).resolve().parents[1]
MODEL_PATH = ROOT_DIR / "src" / "model" / "bloom_svm_model.h5"

app = FastAPI(title="Exam Moderation API")

cors_origins = os.getenv("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in cors_origins if o.strip()],
    allow_credentials=True,
    allow_methods=["*"]
    ,
    allow_headers=["*"]
)


MODEL = None
LABEL_CLASSES = []
MODEL_ACCURACY = None
MODEL_LOAD_ERROR = None

BLOOM_ORDER = ["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"]
BLOOM_LABEL_MAP = {
    "BT1": "Remember",
    "BT2": "Understand",
    "BT3": "Apply",
    "BT4": "Analyze",
    "BT5": "Evaluate",
    "BT6": "Create",
    "REMEMBER": "Remember",
    "UNDERSTAND": "Understand",
    "APPLY": "Apply",
    "ANALYZE": "Analyze",
    "EVALUATE": "Evaluate",
    "CREATE": "Create",
}

DEFAULT_RECOMMENDED_MARKS = {
    "Remember": 5,
    "Understand": 8,
    "Apply": 10,
    "Analyze": 15,
    "Evaluate": 20,
    "Create": 25,
}

MODULE_SECTION_STARTS = {
    "MODULE DESCRIPTION": "description",
    "CONTENTS OF THE MODULE": "contents",
}

MODULE_SECTION_ENDS = {
    "GENERIC INFORMATION",
    "END OF MODULE OUTLINE",
}

MODULE_NOISE_KEYWORDS = [
    "department",
    "faculty",
    "module outline",
    "module code",
    "year",
    "semester",
    "credit points",
    "pre-requisites",
    "co-requisites",
    "methods of delivery",
    "course web site",
    "date of original",
    "approval",
    "date of next review",
    "assessment",
    "criteria",
    "continuous assessments",
    "end semester assessment",
    "contact hours",
    "workload",
    "time allocated",
    "reading and independent study",
    "requirement",
    "references",
    "edition",
    "plagiarism",
    "institute",
    "generic information",
    "topic aligned learning",
]

MODULE_NOISE_PATTERNS = [
    re.compile(r"^page\s+\d+", re.IGNORECASE),
    re.compile(r"^\d+\s*(hours|%|marks?)\b", re.IGNORECASE),
    re.compile(r"^total\b", re.IGNORECASE),
    re.compile(r"^lo\d+\b$", re.IGNORECASE),
]


def load_pipeline_from_h5(model_path: Path):
    with h5py.File(model_path, "r") as h5f:
        model_bytes = bytes(h5f["model_pickle"][()])
        pipeline = pickle.loads(model_bytes)
        label_classes = json.loads(h5f["label_classes"][()].decode("utf-8"))
        accuracy = float(h5f["accuracy"][()])
    return pipeline, label_classes, accuracy


try:
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model file not found at {MODEL_PATH}")
    MODEL, LABEL_CLASSES, MODEL_ACCURACY = load_pipeline_from_h5(MODEL_PATH)
except Exception as exc:  # noqa: BLE001 - surface in /health and /analyze
    MODEL_LOAD_ERROR = str(exc)


def get_extension_from_name(filename: str | None) -> str:
    filename = str(filename or "")
    if "." not in filename:
        return ""
    return filename.rsplit(".", 1)[-1].lower()


def validate_extension_only(filename: str | None) -> bool:
    return get_extension_from_name(filename) in ALLOWED_EXTENSIONS


def read_txt_bytes(file_bytes: bytes) -> str:
    return file_bytes.decode("utf-8", errors="ignore")


def read_docx_bytes(file_bytes: bytes) -> str:
    buffer = io.BytesIO(file_bytes)
    doc = Document(buffer)
    return "\n".join([p.text for p in doc.paragraphs if p.text.strip()])


def _ocr_image(image: Image.Image) -> str:
    try:
        return pytesseract.image_to_string(image).strip()
    except pytesseract.pytesseract.TesseractNotFoundError as exc:
        raise RuntimeError("OCR requires Tesseract to be installed on the server.") from exc


def read_pdf_bytes(file_bytes: bytes) -> str:
    buffer = io.BytesIO(file_bytes)
    text_parts: list[str] = []
    with pdfplumber.open(buffer) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text and page_text.strip():
                text_parts.append(page_text)
            else:
                image = page.to_image(resolution=300).original
                text_parts.append(_ocr_image(image))
    return "\n".join(text_parts).strip()


def read_image_bytes(file_bytes: bytes) -> str:
    image = Image.open(io.BytesIO(file_bytes))
    return _ocr_image(image)


def extract_text_from_bytes(file_bytes: bytes, ext: str) -> str:
    if ext == "txt":
        return read_txt_bytes(file_bytes)
    if ext == "docx":
        return read_docx_bytes(file_bytes)
    if ext == "pdf":
        return read_pdf_bytes(file_bytes)
    if ext in {"png", "jpg", "jpeg"}:
        return read_image_bytes(file_bytes)
    raise ValueError("Unsupported file extension.")


def clean_text(text: str) -> str:
    text = text.replace("\r", "\n")
    text = re.sub(r"\n+", "\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def normalize_module_lines(text: str) -> list[str]:
    text = text.replace("\r", "\n")
    text = re.sub(r"-\n", "", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n+", "\n", text)
    raw_lines = [line.strip() for line in text.split("\n") if line.strip()]

    merged: list[str] = []
    for line in raw_lines:
        if not merged:
            merged.append(line)
            continue
        lower = line.lower()
        is_bullet = line.startswith(("•", "-"))
        is_heading = line.isupper() and len(line.split()) <= 6
        is_numbered = bool(re.match(r"^\d+\s*[\.\)]", line))
        is_lo = bool(re.match(r"^lo\d+\b", line, flags=re.IGNORECASE))

        if (
            not is_bullet
            and not is_heading
            and not is_numbered
            and not is_lo
            and not merged[-1].endswith((".", ":", ";"))
            and lower and lower[0].islower()
        ):
            merged[-1] = f"{merged[-1]} {line}"
        else:
            merged.append(line)

    return merged


def is_module_noise_line(line: str) -> bool:
    low = line.lower()
    if low in {"learning", "outcomes", "learning outcomes"}:
        return True
    if low.startswith("learning at the end"):
        return True
    if "http://" in low or "https://" in low:
        return True
    if len(low) <= 2:
        return True
    if all(ch in "-•" for ch in low):
        return True
    for pattern in MODULE_NOISE_PATTERNS:
        if pattern.search(line):
            return True
    return any(keyword in low for keyword in MODULE_NOISE_KEYWORDS)


def normalize_bloom_label(label: str) -> str:
    key = label.strip().upper()
    return BLOOM_LABEL_MAP.get(key, label)


def normalize_question_for_model(text: str) -> str:
    cleaned = re.sub(r"\(?\b\d{1,3}\s*(?:marks?|pts?|points?)\b\)?", "", text, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s{2,}", " ", cleaned).strip()
    return cleaned or text


def normalize_similarity_text(text: str) -> str:
    cleaned = text.lower()
    cleaned = re.sub(r"\b(question|marks?|mark|page|instructions?)\b", " ", cleaned)
    cleaned = re.sub(r"[^a-z0-9\s]", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def parse_manual_questions(text: str | None) -> list[str]:
    if not text:
        return []
    lines = [line.strip() for line in text.splitlines()]
    return [line for line in lines if line]


def parse_given_marks(question: str) -> int | None:
    match = re.search(r"\(?\b(\d{1,3})\s*(?:marks?|pts?|points?)\b\)?", question, flags=re.IGNORECASE)
    if match:
        value = int(match.group(1))
        if 0 < value <= 200:
            return value
    return None


def estimate_recommended_marks(bloom_level: str, given_marks: int | None) -> int:
    if given_marks and given_marks > 0:
        return int(given_marks)
    return DEFAULT_RECOMMENDED_MARKS.get(bloom_level, 10)


def split_questions(text: str) -> list[str]:
    text = clean_text(text)
    pattern = r"(?i)(?=\n?\s*(?:question\s*\d+|q\s*\d+|\d+\s*[\.\)]))"
    parts = re.split(pattern, "\n" + text)

    questions = []
    for part in parts:
        part = part.strip()
        if part and len(part.split()) >= 3:
            questions.append(part)

    if len(questions) <= 1:
        fallback_parts = [p.strip() for p in text.split("\n") if p.strip()]
        questions = [p for p in fallback_parts if len(p.split()) >= 4]

    return questions


def extract_module_items(module_text: str) -> list[str]:
    module_text = clean_text(module_text)
    lines = [line.strip("-• \t") for line in module_text.split("\n")]
    lines = [line for line in lines if len(line) > 3]

    keywords = [
        "clo",
        "course learning outcome",
        "learning outcome",
        "topic",
        "module",
        "unit",
        "chapter",
        "outcome",
        "objective",
    ]

    items = []
    for line in lines:
        low = line.lower()
        if any(k in low for k in keywords):
            items.append(line)
        elif len(line.split()) >= 3:
            items.append(line)

    seen = set()
    unique_items = []
    for item in items:
        key = item.lower()
        if key not in seen:
            seen.add(key)
            unique_items.append(item)

    return unique_items


def extract_module_structure(module_text: str) -> list[dict[str, str]]:
    lines = normalize_module_lines(module_text)
    items: list[dict[str, str]] = []
    current_topic: str | None = None
    section: str | None = None

    def add_topic(text: str):
        nonlocal current_topic
        current_topic = text
        items.append({"type": "topic", "text": text, "parent_topic": text})

    def add_subtopic(text: str, parent: str):
        items.append({"type": "subtopic", "text": text, "parent_topic": parent})

    for line in lines:
        upper = line.upper()
        if any(key in upper for key in MODULE_SECTION_ENDS):
            section = None
            current_topic = None
            continue

        header_matched = False
        for header, section_name in MODULE_SECTION_STARTS.items():
            if header in upper:
                section = section_name
                current_topic = None
                header_matched = True
                break
        if header_matched:
            continue
        if section is None:
            continue

        if is_module_noise_line(line):
            continue

        if section == "description":
            if re.match(r"^LO\d+\s*[:\-]", line, flags=re.IGNORECASE):
                if current_topic != "Learning Outcomes":
                    add_topic("Learning Outcomes")
                add_subtopic(line, "Learning Outcomes")
                continue
            if line.lower().startswith("introduction"):
                if current_topic != "Module Description":
                    add_topic("Module Description")
                add_subtopic(line, "Module Description")
                continue
            if line.lower() in {"learning", "outcomes", "learning outcomes"}:
                continue
            if current_topic == "Module Description":
                add_subtopic(line, current_topic)
            continue

        if section == "contents":
            if re.match(r"^\d+\s*[\.\)]", line):
                topic = re.sub(r"^\d+\s*[\.\)]\s*", "", line).strip()
                topic = re.sub(r"\bLO\d+(?:\s*,\s*LO\d+)*\b", "", topic, flags=re.IGNORECASE).strip(" ,;-")
                if topic:
                    add_topic(topic)
                continue
            if line.startswith(("•", "-")):
                sub = line.lstrip("•- ").strip()
                sub = re.sub(r"\bLO\d+(?:\s*,\s*LO\d+)*\b", "", sub, flags=re.IGNORECASE).strip(" ,;-")
                if sub:
                    if current_topic:
                        add_subtopic(sub, current_topic)
                    else:
                        add_topic(sub)
                continue
            if re.match(r"^LO\d+\b", line, flags=re.IGNORECASE):
                continue
            if current_topic:
                add_subtopic(line, current_topic)

    seen: set[tuple[str, str]] = set()
    unique_items: list[dict[str, str]] = []
    for item in items:
        key = (item["type"], item["text"].lower())
        if key not in seen:
            seen.add(key)
            unique_items.append(item)

    return unique_items


def sentence_similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def compute_best_matches(module_items: list[dict[str, str]], questions: list[str]) -> list[tuple[float, str | None]]:
    if not module_items or not questions:
        return [(0.0, None) for _ in module_items]

    module_texts = [normalize_similarity_text(item["text"]) for item in module_items]
    question_texts = [normalize_similarity_text(q) for q in questions]

    sim_matrix = None
    try:
        vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2))
        tfidf = vectorizer.fit_transform(module_texts + question_texts)
        module_vecs = tfidf[: len(module_texts)]
        question_vecs = tfidf[len(module_texts) :]
        word_sim = (module_vecs * question_vecs.T).toarray()

        char_vectorizer = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5))
        char_tfidf = char_vectorizer.fit_transform(module_texts + question_texts)
        char_module = char_tfidf[: len(module_texts)]
        char_question = char_tfidf[len(module_texts) :]
        char_sim = (char_module * char_question.T).toarray()

        sim_matrix = np.maximum(word_sim, char_sim * 0.9)
    except ValueError:
        sim_matrix = None

    results: list[tuple[float, str | None]] = []
    for idx, item in enumerate(module_items):
        if sim_matrix is not None and sim_matrix.size:
            row = sim_matrix[idx]
            best_idx = int(row.argmax()) if row.size else -1
            best_score = float(row[best_idx]) if best_idx >= 0 else 0.0
            best_question = questions[best_idx] if best_idx >= 0 else None
        else:
            best_score = 0.0
            best_question = None
            for question in questions:
                score = sentence_similarity(item["text"], question)
                if score > best_score:
                    best_score = score
                    best_question = question
        results.append((best_score, best_question))
    return results


def evaluate_match(questions: list[str], module_items: list[str], item_threshold: float = 0.35, coverage_threshold: float = 0.60):
    if not module_items:
        return {
            "match": False,
            "coverage_ratio": 0.0,
            "missing_items": ["No module items were detected."],
            "covered_items": [],
        }

    covered_items = []
    missing_items = []

    best_matches = compute_best_matches(
        [{"type": "topic", "text": item, "parent_topic": item} for item in module_items],
        questions,
    )
    for item, (score, matched_question) in zip(module_items, best_matches):
        info = {"module_item": item, "score": round(score, 3), "matched_question": matched_question}
        if score >= item_threshold:
            covered_items.append(info)
        else:
            missing_items.append(info)

    coverage_ratio = len(covered_items) / len(module_items)
    is_match = coverage_ratio >= coverage_threshold

    return {
        "match": is_match,
        "coverage_ratio": round(coverage_ratio, 3),
        "missing_items": missing_items,
        "covered_items": covered_items,
    }


def build_coverage(questions: list[str], module_items: list[dict[str, str]], item_threshold: float = 0.10, coverage_threshold: float = 0.60):
    if not module_items:
        return {
            "overall_coverage_ratio": 0.0,
            "covered_items": [],
            "missing_items": [
                {
                    "type": "topic",
                    "text": "No module items were detected.",
                    "parent_topic": "Module",
                    "score": 0.0,
                    "matched_question": None,
                }
            ],
            "topic_summary": [],
        }

    covered_items: list[dict[str, Any]] = []
    missing_items: list[dict[str, Any]] = []

    best_matches = compute_best_matches(module_items, questions)
    for item, (score, matched_question) in zip(module_items, best_matches):
        info = {
            "type": item["type"],
            "text": item["text"],
            "parent_topic": item["parent_topic"],
            "score": round(score, 3),
            "matched_question": matched_question,
        }
        if score >= item_threshold:
            covered_items.append(info)
        else:
            missing_items.append(info)

    coverage_ratio = len(covered_items) / len(module_items)

    topic_names = []
    for item in module_items:
        if item["type"] == "topic":
            topic_names.append(item["text"])
    if not topic_names:
        topic_names = [item["parent_topic"] for item in module_items]

    seen_topics: set[str] = set()
    topic_summary: list[dict[str, Any]] = []
    for topic in topic_names:
        if topic in seen_topics:
            continue
        seen_topics.add(topic)
        topic_item = next((i for i in covered_items + missing_items if i["type"] == "topic" and i["text"] == topic), None)
        topic_score = float(topic_item["score"]) if topic_item else 0.0
        subtopics = [i for i in covered_items + missing_items if i["type"] == "subtopic" and i["parent_topic"] == topic]
        if subtopics:
            covered_subs = [i for i in covered_items if i["type"] == "subtopic" and i["parent_topic"] == topic]
            subtopic_score = len(covered_subs) / len(subtopics)
        else:
            subtopic_score = 1.0 if topic_item and topic_item in covered_items else 0.0

        status = "Covered" if (topic_score >= coverage_threshold or subtopic_score >= coverage_threshold) else "Needs attention"
        topic_summary.append({
            "topic": topic,
            "topic_coverage_score": round(topic_score, 3),
            "subtopic_coverage_score": round(subtopic_score, 3),
            "status": status,
        })

    return {
        "overall_coverage_ratio": round(coverage_ratio, 3),
        "covered_items": covered_items,
        "missing_items": missing_items,
        "topic_summary": topic_summary,
    }


def build_recommendations(missing_items: list[dict[str, Any]], limit: int = 5) -> list[str]:
    if not missing_items:
        return []
    recommendations = []
    for item in missing_items[:limit]:
        label = "topic" if item["type"] == "topic" else "subtopic"
        recommendations.append(f"Add at least one question for {label}: {item['text']}")
    return recommendations


def predict_bloom_levels(model: Any, questions: list[str]):
    if not questions:
        return []
    cleaned_questions = [normalize_question_for_model(q) for q in questions]
    preds = model.predict(cleaned_questions)
    results = []
    for question, pred in zip(questions, preds):
        bloom_level = normalize_bloom_label(str(pred))
        given_marks = parse_given_marks(question)
        recommended_marks = estimate_recommended_marks(bloom_level, given_marks)
        results.append(
            {
                "question": question,
                "predicted_bloom": bloom_level,
                "given_marks": given_marks,
                "recommended_marks": recommended_marks,
            }
        )
    return results


def build_bloom_distribution(bloom_predictions: list[dict[str, Any]]) -> dict[str, int]:
    counts = {level: 0 for level in BLOOM_ORDER}
    for pred in bloom_predictions:
        level = pred.get("predicted_bloom")
        if level in counts:
            counts[level] += 1
    return counts


def build_report_summary(
    questions_detected: int,
    bloom_predictions: list[dict[str, Any]],
    coverage: dict[str, Any],
    recommendations: list[str],
) -> dict[str, Any]:
    given_total = sum((p.get("given_marks") or 0) for p in bloom_predictions)
    recommended_total = sum((p.get("recommended_marks") or 0) for p in bloom_predictions)
    return {
        "questions_detected": questions_detected,
        "bloom_distribution": build_bloom_distribution(bloom_predictions),
        "overall_coverage_ratio": coverage.get("overall_coverage_ratio", 0.0),
        "given_total_marks": given_total,
        "recommended_total_marks": recommended_total,
        "missing_items": coverage.get("missing_items", []),
        "topic_summary": coverage.get("topic_summary", []),
        "recommendations": recommendations,
    }


def analyze_payload(
    module_bytes: bytes,
    module_filename: str | None,
    paper_bytes: bytes,
    paper_filename: str | None,
    manual_questions: str | None,
) -> dict[str, Any]:
    module_text = extract_text_from_bytes(module_bytes, get_extension_from_name(module_filename))
    paper_text = extract_text_from_bytes(paper_bytes, get_extension_from_name(paper_filename))

    questions = split_questions(paper_text)
    questions.extend(parse_manual_questions(manual_questions))
    questions = [q.strip() for q in questions if q.strip()]

    module_items = extract_module_structure(module_text)

    bloom_results = predict_bloom_levels(MODEL, questions)
    coverage = build_coverage(questions, module_items)
    recommendations = build_recommendations(coverage.get("missing_items", []))

    report = build_report_summary(len(questions), bloom_results, coverage, recommendations)

    return {
        "model_accuracy": MODEL_ACCURACY,
        "questions_detected": len(questions),
        "bloom_predictions": bloom_results,
        "coverage": coverage,
        "recommendations": recommendations,
        "report": report,
    }


def generate_pdf_report(analysis: dict[str, Any]) -> bytes:
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError("PDF generation requires the reportlab package.") from exc

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    _, height = letter
    margin = 54
    y = height - margin

    def write_lines(lines: list[str], size: int = 11, bold: bool = False):
        nonlocal y
        font = "Helvetica-Bold" if bold else "Helvetica"
        for line in lines:
            if y < margin:
                c.showPage()
                y = height - margin
            c.setFont(font, size)
            c.drawString(margin, y, line)
            y -= size + 4

    def write_heading(text: str):
        nonlocal y
        write_lines([text], size=14, bold=True)
        y -= 6

    summary = analysis.get("report", {})
    coverage = analysis.get("coverage", {})
    bloom_distribution = summary.get("bloom_distribution", {})

    write_lines(["Exam Moderation Report"], size=16, bold=True)
    write_lines([f"Questions detected: {summary.get('questions_detected', 0)}"])
    write_lines([f"Coverage ratio: {summary.get('overall_coverage_ratio', 0.0) * 100:.1f}%"])
    write_lines([f"Given total marks: {summary.get('given_total_marks', 0)}"])
    write_lines([f"Recommended total marks: {summary.get('recommended_total_marks', 0)}"])
    model_accuracy = analysis.get("model_accuracy")
    if model_accuracy is None:
        accuracy_text = "N/A"
    else:
        accuracy_text = f"{float(model_accuracy) * 100:.1f}%"
    write_lines([f"Model accuracy: {accuracy_text}"])
    write_lines([""])

    write_heading("Bloom Distribution")
    for level in BLOOM_ORDER:
        count = bloom_distribution.get(level, 0)
        write_lines([f"{level}: {count}"], size=11)
    write_lines([""])

    write_heading("Covered Topics")
    covered_items = coverage.get("covered_items", [])
    for item in covered_items[:15]:
        write_lines([f"- {item['type'].title()}: {item['text']} (score {item['score']})"], size=10)
    if len(covered_items) > 15:
        write_lines(["- (truncated)"], size=10)
    write_lines([""])

    write_heading("Missing Topics")
    missing_items = coverage.get("missing_items", [])
    for item in missing_items[:15]:
        write_lines([f"- {item['type'].title()}: {item['text']} (score {item['score']})"], size=10)
    if len(missing_items) > 15:
        write_lines(["- (truncated)"], size=10)
    write_lines([""])

    write_heading("Recommendations")
    recs = analysis.get("recommendations", [])
    if recs:
        for rec in recs:
            for wrapped in textwrap.wrap(rec, width=95):
                write_lines([f"- {wrapped}"], size=10)
    else:
        write_lines(["All topics are well covered. No recommendations needed."], size=10)

    c.showPage()
    c.save()
    return buffer.getvalue()


@app.get("/health")
def health():
    if MODEL is None:
        return {"status": "error", "detail": MODEL_LOAD_ERROR}
    return {"status": "ok", "accuracy": MODEL_ACCURACY, "labels": LABEL_CLASSES}


@app.post("/analyze")
async def analyze(
    module: UploadFile = File(...),
    paper: UploadFile = File(...),
    manual_questions: str | None = Form(None),
):
    if MODEL is None:
        raise HTTPException(status_code=500, detail=f"Model failed to load: {MODEL_LOAD_ERROR}")

    if not validate_extension_only(module.filename):
        raise HTTPException(status_code=400, detail="Module file extension is not supported.")
    if not validate_extension_only(paper.filename):
        raise HTTPException(status_code=400, detail="Paper file extension is not supported.")

    module_bytes = await module.read()
    paper_bytes = await paper.read()

    try:
        analysis = analyze_payload(
            module_bytes=module_bytes,
            module_filename=module.filename,
            paper_bytes=paper_bytes,
            paper_filename=paper.filename,
            manual_questions=manual_questions,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001 - return user-friendly error
        raise HTTPException(status_code=400, detail=f"Failed to analyze files: {exc}") from exc

    return analysis


@app.post("/report")
async def report(
    module: UploadFile = File(...),
    paper: UploadFile = File(...),
    manual_questions: str | None = Form(None),
):
    if MODEL is None:
        raise HTTPException(status_code=500, detail=f"Model failed to load: {MODEL_LOAD_ERROR}")

    if not validate_extension_only(module.filename):
        raise HTTPException(status_code=400, detail="Module file extension is not supported.")
    if not validate_extension_only(paper.filename):
        raise HTTPException(status_code=400, detail="Paper file extension is not supported.")

    module_bytes = await module.read()
    paper_bytes = await paper.read()

    try:
        analysis = analyze_payload(
            module_bytes=module_bytes,
            module_filename=module.filename,
            paper_bytes=paper_bytes,
            paper_filename=paper.filename,
            manual_questions=manual_questions,
        )
        pdf_bytes = generate_pdf_report(analysis)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001 - return user-friendly error
        raise HTTPException(status_code=400, detail=f"Failed to generate report: {exc}") from exc

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=quality_summary_report.pdf"},
    )
