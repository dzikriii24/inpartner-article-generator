from sqlalchemy.orm import Session
from models import Source, Topic, NewsEmbedding, NewsContent
from sklearn.metrics.pairwise import cosine_similarity
from datetime import datetime
import json
import numpy as np

from services.llm_client import embed_texts

def standardize_emb(emb_data, dim=768):
    if not isinstance(emb_data, list):
        try:
            emb_data = json.loads(emb_data) if isinstance(emb_data, str) else list(emb_data)
        except:
            emb_data = []
    if len(emb_data) > dim:
        return emb_data[:dim]
    elif len(emb_data) < dim:
        return emb_data + [0.0] * (dim - len(emb_data))
    return emb_data

def cluster_topics(db: Session):
    print("Starting Topic Clustering...")
    # Get sources that don't have a topic yet
    unassigned_sources = db.query(Source).filter(Source.topic_id == None).all()
    if not unassigned_sources:
        print("No new sources to cluster.")
        return 0
        
    embeddings_list = []
    valid_sources = []
    
    texts_to_embed = []
    text_to_source = []
    
    for s in unassigned_sources:
        # Check if already embedded
        existing_emb = db.query(NewsEmbedding).filter(NewsEmbedding.source_id == s.id).first()
        if existing_emb and existing_emb.embedding:
            embeddings_list.append(np.array(standardize_emb(existing_emb.embedding)))
            valid_sources.append(s)
        else:
            # Combine title and full content for better semantic understanding
            content_row = db.query(NewsContent).filter(NewsContent.source_id == s.id).first()
            content_text = content_row.cleaned_content if content_row and content_row.cleaned_content else (s.description or "")
            text_to_embed = f"{s.title}. {content_text[:1000]}" # Limit to first 1000 chars for embedding speed
            texts_to_embed.append(text_to_embed)
            text_to_source.append(s)
            
    if texts_to_embed:
        new_embs = embed_texts(texts_to_embed)
        for i, s in enumerate(text_to_source):
            emb = np.array(standardize_emb(new_embs[i]))
            # Save embedding
            new_emb_db = NewsEmbedding(
                source_id=s.id,
                embedding=emb.tolist(),
                model_name='gemini-embedding-2',
                created_at=datetime.utcnow()
            )
            db.add(new_emb_db)
            embeddings_list.append(emb)
            valid_sources.append(s)
        db.commit()
        
    if not embeddings_list:
        return 0
        
    embeddings_matrix = np.array(embeddings_list)
    similarity_matrix = cosine_similarity(embeddings_matrix)
    
    threshold = 0.65 # Semantic similarity threshold
    clusters = []
    visited = set()
    
    for i in range(len(valid_sources)):
        if i in visited:
            continue
        current_cluster = [i]
        visited.add(i)
        
        for j in range(i+1, len(valid_sources)):
            if j not in visited and similarity_matrix[i][j] > threshold:
                current_cluster.append(j)
                visited.add(j)
                
        clusters.append(current_cluster)
        
    # Save clusters to DB as Topics
    for cluster_indices in clusters:
        # Create a new topic based on the first item in the cluster
        main_source = valid_sources[cluster_indices[0]]
        
        # Infer category from title
        title_lower = main_source.title.lower()
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
            title=main_source.title, # Naive topic title
            category=cat, 
            score=len(cluster_indices) * 10.0, # Simple score based on volume
            detected_at=datetime.utcnow(),
            status="DISCOVERED"
        )
        db.add(topic)
        db.flush()
        
        # Assign topic_id to sources
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
        # Get content text
        content_row = db.query(NewsContent).filter(NewsContent.source_id == s.id).first()
        content_text = content_row.cleaned_content if content_row and content_row.cleaned_content else (s.description or "")
        text_to_embed = f"{s.title}. {content_text[:1000]}"
        
        # Check existing embedding or encode
        existing_emb = db.query(NewsEmbedding).filter(NewsEmbedding.source_id == s.id).first()
        if existing_emb and existing_emb.embedding:
            scored_sources_tuples.append({'source': s, 'emb': np.array(standardize_emb(existing_emb.embedding))})
        else:
            texts_to_embed.append(text_to_embed)
            src_indices_to_embed.append(s)
            
    # Embed the prompt and any missing sources using Gemini
    new_embs = embed_texts(texts_to_embed)
    prompt_emb = np.array(standardize_emb(new_embs[0]))
    
    for idx, s in enumerate(src_indices_to_embed):
        emb = np.array(standardize_emb(new_embs[idx + 1]))
        scored_sources_tuples.append({'source': s, 'emb': emb})
        
    scored_sources = []
    for item in scored_sources_tuples:
        sim = float(cosine_similarity([prompt_emb], [item['emb']])[0][0])
        scored_sources.append((sim, item['source']))
        
    # Sort descending by similarity
    scored_sources.sort(key=lambda x: x[0], reverse=True)
    
    # Return top_k sources
    relevant = [s for score, s in scored_sources if score >= 0.20]
    if not relevant:
        relevant = [s for score, s in scored_sources[:top_k]] # Fallback to top_k
        
    return relevant[:top_k]

