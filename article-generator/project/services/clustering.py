from sqlalchemy.orm import Session
from models import Source, Topic, NewsEmbedding, NewsContent
from datetime import datetime
import json
import math

from services.llm_client import embed_texts


def standardize_emb(emb_data, dim=768) -> list[float]:
    if not isinstance(emb_data, list):
        try:
            emb_data = json.loads(emb_data) if isinstance(emb_data, str) else list(emb_data)
        except Exception:
            emb_data = []
    emb_floats = [float(x) for x in emb_data[:dim]]
    if len(emb_floats) < dim:
        emb_floats.extend([0.0] * (dim - len(emb_floats)))
    return emb_floats


def cosine_sim(v1: list[float], v2: list[float]) -> float:
    dot = 0.0
    n1 = 0.0
    n2 = 0.0
    for a, b in zip(v1, v2):
        dot += a * b
        n1 += a * a
        n2 += b * b
    if n1 <= 1e-12 or n2 <= 1e-12:
        return 0.0
    return dot / (math.sqrt(n1) * math.sqrt(n2))


def cluster_topics(db: Session):
    print("Starting Topic Clustering...")
    # Bound unassigned sources per run to prevent excessive RAM consumption
    unassigned_sources = db.query(Source).filter(Source.topic_id == None).limit(120).all()
    if not unassigned_sources:
        print("No new sources to cluster.")
        return 0

    embeddings_list = []
    valid_sources = []

    texts_to_embed = []
    text_to_source = []

    for s in unassigned_sources:
        existing_emb = db.query(NewsEmbedding).filter(NewsEmbedding.source_id == s.id).first()
        if existing_emb and existing_emb.embedding:
            embeddings_list.append(standardize_emb(existing_emb.embedding))
            valid_sources.append(s)
        else:
            content_row = db.query(NewsContent).filter(NewsContent.source_id == s.id).first()
            content_text = content_row.cleaned_content if content_row and content_row.cleaned_content else (s.description or "")
            text_to_embed = f"{s.title}. {content_text[:800]}"
            texts_to_embed.append(text_to_embed)
            text_to_source.append(s)

    if texts_to_embed:
        new_embs = embed_texts(texts_to_embed)
        for i, s in enumerate(text_to_source):
            emb = standardize_emb(new_embs[i])
            new_emb_db = NewsEmbedding(
                source_id=s.id,
                embedding=emb,
                model_name='gemini-embedding-2',
                created_at=datetime.utcnow()
            )
            db.add(new_emb_db)
            embeddings_list.append(emb)
            valid_sources.append(s)
        db.commit()

    if not embeddings_list:
        return 0

    threshold = 0.65
    clusters = []
    visited = set()

    n_sources = len(valid_sources)
    for i in range(n_sources):
        if i in visited:
            continue
        current_cluster = [i]
        visited.add(i)

        emb_i = embeddings_list[i]
        for j in range(i + 1, n_sources):
            if j not in visited and cosine_sim(emb_i, embeddings_list[j]) > threshold:
                current_cluster.append(j)
                visited.add(j)

        clusters.append(current_cluster)

    for cluster_indices in clusters:
        main_source = valid_sources[cluster_indices[0]]

        title_lower = (main_source.title or "").lower()
        cat = "Business"
        if any(kw in title_lower for kw in ["indonesia", "jokowi", "prabowo", "jakarta", "nasional", "rupiah", "bumn", "nusantara", "ikn", "dpr", "kpk", "polri", "mk", "mahkamah", "kpu", "gibran", "menteri", "pemerintah"]):
            cat = "Nasional"
        elif any(kw in title_lower for kw in ["crypto", "bitcoin", "ethereum", "btc", "eth", "kripto"]):
            cat = "Crypto"
        elif any(kw in title_lower for kw in ["saham", "stock", "invest", "ihsg", "ekonomi", "finance", "bank"]):
            cat = "Ekonomi"
        elif any(kw in title_lower for kw in ["tech", "ai", "google", "apple", "microsoft", "teknologi"]):
            cat = "Teknologi"

        topic = Topic(
            title=main_source.title,
            category=cat,
            score=len(cluster_indices) * 10.0,
            detected_at=datetime.utcnow(),
            status="DISCOVERED"
        )
        db.add(topic)
        db.flush()

        for idx in cluster_indices:
            valid_sources[idx].topic_id = topic.id
            db.add(valid_sources[idx])

    db.commit()
    print(f"Created {len(clusters)} topics from {len(valid_sources)} sources.")
    return len(clusters)


def filter_relevant_sources_for_prompt(db: Session, sources: list, user_prompt: str, top_k: int = 10) -> list:
    """
    Ranks and filters a list of Source objects by semantic similarity to user_prompt.
    """
    if not sources or not user_prompt:
        return sources[:top_k]

    texts_to_embed = [user_prompt]
    src_indices_to_embed = []
    scored_sources_tuples = []

    for s in sources:
        content_row = db.query(NewsContent).filter(NewsContent.source_id == s.id).first()
        content_text = content_row.cleaned_content if content_row and content_row.cleaned_content else (s.description or "")
        text_to_embed = f"{s.title}. {content_text[:800]}"

        existing_emb = db.query(NewsEmbedding).filter(NewsEmbedding.source_id == s.id).first()
        if existing_emb and existing_emb.embedding:
            scored_sources_tuples.append({'source': s, 'emb': standardize_emb(existing_emb.embedding)})
        else:
            texts_to_embed.append(text_to_embed)
            src_indices_to_embed.append(s)

    new_embs = embed_texts(texts_to_embed)
    prompt_emb = standardize_emb(new_embs[0])

    for idx, s in enumerate(src_indices_to_embed):
        emb = standardize_emb(new_embs[idx + 1])
        scored_sources_tuples.append({'source': s, 'emb': emb})

    scored_sources = []
    for item in scored_sources_tuples:
        sim = cosine_sim(prompt_emb, item['emb'])
        scored_sources.append((sim, item['source']))

    scored_sources.sort(key=lambda x: x[0], reverse=True)

    relevant = [s for score, s in scored_sources if score >= 0.20]
    if not relevant:
        relevant = [s for score, s in scored_sources[:top_k]]

    return relevant[:top_k]
