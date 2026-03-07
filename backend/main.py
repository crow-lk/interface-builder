from __future__ import annotations

import io
import json
import os
import pickle
import re
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any

import h5py
import pdfplumber
import pytesseract
from docx import Document
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
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


def sentence_similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def item_is_covered(module_item: str, questions: list[str], threshold: float = 0.35):
    best_score = 0.0
    best_question = None
    for question in questions:
        score = sentence_similarity(module_item, question)
        if score > best_score:
            best_score = score
            best_question = question
    return best_score >= threshold, best_score, best_question


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

    for item in module_items:
        covered, score, matched_question = item_is_covered(item, questions, threshold=item_threshold)
        info = {
            "module_item": item,
            "score": round(score, 3),
            "matched_question": matched_question,
        }
        if covered:
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


def predict_bloom_levels(model: Any, questions: list[str]):
    if not questions:
        return []
    preds = model.predict(questions)
    return [{"question": q, "predicted_bloom": p} for q, p in zip(questions, preds)]


@app.get("/health")
def health():
    if MODEL is None:
        return {"status": "error", "detail": MODEL_LOAD_ERROR}
    return {"status": "ok", "accuracy": MODEL_ACCURACY, "labels": LABEL_CLASSES}


@app.post("/analyze")
async def analyze(module: UploadFile = File(...), paper: UploadFile = File(...)):
    if MODEL is None:
        raise HTTPException(status_code=500, detail=f"Model failed to load: {MODEL_LOAD_ERROR}")

    if not validate_extension_only(module.filename):
        raise HTTPException(status_code=400, detail="Module file extension is not supported.")
    if not validate_extension_only(paper.filename):
        raise HTTPException(status_code=400, detail="Paper file extension is not supported.")

    module_bytes = await module.read()
    paper_bytes = await paper.read()

    try:
        module_text = extract_text_from_bytes(module_bytes, get_extension_from_name(module.filename))
        paper_text = extract_text_from_bytes(paper_bytes, get_extension_from_name(paper.filename))
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001 - return user-friendly error
        raise HTTPException(status_code=400, detail=f"Failed to read files: {exc}") from exc

    questions = split_questions(paper_text)
    module_items = extract_module_items(module_text)

    bloom_results = predict_bloom_levels(MODEL, questions)
    match_result = evaluate_match(questions, module_items)

    return {
        "matched": bool(match_result["match"]),
        "coverageRatio": float(match_result["coverage_ratio"]),
        "questions": [
            {"number": i + 1, "text": item["question"], "bloomLevel": item["predicted_bloom"]}
            for i, item in enumerate(bloom_results)
        ],
        "coveredTopics": [item["module_item"] for item in match_result.get("covered_items", [])],
        "missingTopics": [
            item["module_item"] if isinstance(item, dict) else str(item)
            for item in match_result.get("missing_items", [])
        ],
    }
