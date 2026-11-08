import os
import re
import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger(__name__)

CONFIG_PATH = Path(__file__).resolve().parent.parent / "config" / "target_roles.json"

class JobTitleClassifier:
    _instance = None
    _cached_data = None
    _last_mtime = 0

    def __init__(self):
        self._load_config()

    def _load_config(self) -> Dict[str, Any]:
        try:
            if CONFIG_PATH.exists():
                mtime = os.path.getmtime(CONFIG_PATH)
                if self._cached_data is None or mtime > self._last_mtime:
                    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                        self._cached_data = json.load(f)
                        self._last_mtime = mtime
            else:
                self._cached_data = {"categories": []}
        except Exception as e:
            logger.error(f"Error loading target roles config: {e}")
            if self._cached_data is None:
                self._cached_data = {"categories": []}
        return self._cached_data

    def get_config(self) -> Dict[str, Any]:
        return self._load_config()

    def save_config(self, new_config: Dict[str, Any]) -> bool:
        try:
            with open(CONFIG_PATH, "w", encoding="utf-8") as f:
                json.dump(new_config, f, indent=2, ensure_ascii=False)
            self._cached_data = new_config
            self._last_mtime = os.path.getmtime(CONFIG_PATH)
            return True
        except Exception as e:
            logger.error(f"Error saving target roles config: {e}")
            return False

    @staticmethod
    def normalize_text(text: str) -> str:
        if not text:
            return ""
        # Remove special characters, brackets, punctuation
        cleaned = re.sub(r'[\(\)\[\]\{\}\<\>\,\.\;\:\/\-\_\&\|]', ' ', text.lower())
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()
        return cleaned

    def classify_role(self, raw_title: str, context_text: Optional[str] = None) -> Dict[str, Any]:
        """
        Evaluate if a job title is relevant to HR, Human Capital, Talent Acquisition, or Strategic Decision Makers.
        Returns matching metadata, department, seniority level, relevance score, and human-readable explanation.
        """
        if not raw_title or len(raw_title.strip()) < 2:
            return {
                "is_match": False,
                "matched_title": None,
                "department": "Other",
                "seniority_level": "Staff",
                "relevance_score": 0.0,
                "relevance_reason": "Jabatan tidak teridentifikasi",
                "is_priority_hr": False
            }

        norm_title = self.normalize_text(raw_title)
        config = self._load_config()

        best_match = None
        highest_score = 0.0

        # Scan all categories and roles
        for cat in config.get("categories", []):
            department = cat.get("department", "Human Resources")
            is_hr_cat = cat.get("id") in ["human_resources", "people_and_culture", "talent_acquisition"]

            for role in cat.get("roles", []):
                title = role.get("title", "")
                aliases = role.get("aliases", [])
                seniority = role.get("seniority", "Manager")
                base_weight = role.get("weight", 0.85)

                all_patterns = [title] + aliases
                for pat in all_patterns:
                    norm_pat = self.normalize_text(pat)
                    if not norm_pat:
                        continue

                    # Exact or word boundary match
                    pattern_regex = r'\b' + re.escape(norm_pat) + r'\b'
                    if re.search(pattern_regex, norm_title):
                        # Calculate match strength
                        ratio = len(norm_pat) / max(len(norm_title), 1)
                        score = base_weight * (0.85 + 0.15 * min(1.0, ratio))
                        
                        if score > highest_score:
                            highest_score = score
                            best_match = {
                                "is_match": True,
                                "matched_title": title,
                                "department": department,
                                "seniority_level": seniority,
                                "relevance_score": round(min(0.99, score), 2),
                                "is_priority_hr": is_hr_cat,
                                "matched_alias": pat
                            }

        # If no explicit alias match found, use heuristic token analysis for Indonesian & English HR titles
        if not best_match:
            best_match = self._heuristic_title_match(norm_title, raw_title)

        # Generate a professional relevance reason
        if best_match and best_match["is_match"]:
            reason = self._generate_relevance_reason(
                best_match["matched_title"] or raw_title,
                best_match["department"],
                best_match["seniority_level"],
                best_match.get("is_priority_hr", False)
            )
            best_match["relevance_reason"] = reason
        else:
            best_match = {
                "is_match": False,
                "matched_title": None,
                "department": "Other",
                "seniority_level": self._infer_seniority_only(norm_title),
                "relevance_score": 0.20,
                "relevance_reason": "Bukan posisi HR atau pimpinan eksekutif target",
                "is_priority_hr": False
            }

        return best_match

    def _infer_seniority_only(self, norm_title: str) -> str:
        if any(w in norm_title for w in ["chief", "c-level", "chro", "cpo", "ceo", "presiden direktur", "direktur utama", "komisaris utama"]):
            return "C-Level"
        if any(w in norm_title for w in ["director", "direktur", "dewan direksi", "komisaris", "dewan komisaris"]):
            return "Director"
        if any(w in norm_title for w in ["vice president", "vp", "svp", "evp"]):
            return "VP"
        if any(w in norm_title for w in ["head", "kepala", "general manager", "gm"]):
            return "Head"
        if any(w in norm_title for w in ["lead", "leader", "hrbp"]):
            return "Lead"
        if any(w in norm_title for w in ["manager", "manajer"]):
            return "Manager"
        if any(w in norm_title for w in ["specialist", "spesialis", "expert", "consultant"]):
            return "Specialist"
        return "Staff"

    def _heuristic_title_match(self, norm_title: str, raw_title: str) -> Dict[str, Any]:
        # HR / People keywords
        has_hr_word = any(w in norm_title for w in [
            "human resources", "human resource", "hr", "human capital", "hc", 
            "sdm", "sumber daya manusia", "people & culture", "people and culture",
            "people operations", "talent acquisition", "recruitment", "rekrutmen",
            "talent management", "learning & development", "organization development",
            "people development", "employee relations", "industrial relations"
        ])

        # Leadership keywords
        has_leadership_word = any(w in norm_title for w in [
            "direktur utama", "president director", "managing director", "ceo",
            "direktur", "director", "dewan direksi", "board of directors",
            "komisaris utama", "chief", "corporate secretary", "sekretaris perusahaan"
        ])

        seniority = self._infer_seniority_only(norm_title)

        if has_hr_word:
            dept = "Human Resources"
            if any(w in norm_title for w in ["talent", "recruitment", "rekrutmen", "acquisition"]):
                dept = "Talent Acquisition"
            elif any(w in norm_title for w in ["human capital", "hc"]):
                dept = "Human Capital"
            elif any(w in norm_title for w in ["people", "culture"]):
                dept = "People & Culture"

            # Base score based on seniority
            score_map = {
                "C-Level": 0.98,
                "Director": 0.95,
                "VP": 0.93,
                "Head": 0.92,
                "Manager": 0.90,
                "Lead": 0.88,
                "Specialist": 0.82,
                "Staff": 0.75
            }
            score = score_map.get(seniority, 0.80)
            return {
                "is_match": True,
                "matched_title": raw_title,
                "department": dept,
                "seniority_level": seniority,
                "relevance_score": score,
                "is_priority_hr": True
            }

        if has_leadership_word:
            score_map = {
                "C-Level": 0.92,
                "Director": 0.88,
                "VP": 0.85,
                "Head": 0.82,
                "Manager": 0.75,
                "Lead": 0.70,
                "Specialist": 0.65,
                "Staff": 0.60
            }
            score = score_map.get(seniority, 0.75)
            return {
                "is_match": True,
                "matched_title": raw_title,
                "department": "Leadership",
                "seniority_level": seniority,
                "relevance_score": score,
                "is_priority_hr": False
            }

        return {
            "is_match": False,
            "matched_title": None,
            "department": "Other",
            "seniority_level": seniority,
            "relevance_score": 0.15,
            "is_priority_hr": False
        }

    def _generate_relevance_reason(self, title: str, department: str, seniority: str, is_hr: bool) -> str:
        if is_hr or department in ["Human Resources", "Human Capital", "Talent Acquisition", "People & Culture"]:
            if seniority in ["C-Level", "Director", "VP", "Head"]:
                return f"Pimpinan strategis di bidang {department} ({title}) yang memegang wewenang utama pengelolaan SDM, rekrutmen, dan kebijakan kemitraan perusahaan."
            elif seniority == "Manager":
                return f"Manajer di bidang {department} ({title}) yang menangani operasional talenta, hiring, dan program pengembangan karyawan."
            elif seniority in ["Lead", "Specialist"]:
                return f"Spesialis / Lead di bidang {department} ({title}) yang terlibat langsung dalam proses akuisisi talenta dan kolaborasi profesional."
            else:
                return f"Profesional di bidang {department} ({title}) yang relevan untuk inisiasi kontak rekrutmen atau kemitraan."
        elif department == "Leadership":
            return f"Pengambil keputusan tingkat tinggi ({title}) yang berwenang atas keputusan strategis dan partnership korporat."
        return f"Pengambil keputusan di posisi {title}."

    def classify(self, raw_title: str, context_text: Optional[str] = None) -> Dict[str, Any]:
        return self.classify_role(raw_title, context_text)

role_classifier = JobTitleClassifier()

def get_job_title_classifier() -> JobTitleClassifier:
    return role_classifier

