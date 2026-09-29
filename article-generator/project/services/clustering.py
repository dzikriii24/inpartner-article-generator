from sqlalchemy.orm import Session
from models import Source, Topic, NewsEmbedding, NewsContent
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from datetime import datetime
import json
import numpy as np

# Load local embedding model
model = SentenceTransformer('all-MiniLM-L6-v2')


def cluster_topics(db: Session):
    print("Starting Topic Clustering...")
    # Get sources that don't have a topic yet
    unassigned_sources = db.query(Source).filter(Source.topic_id == None).all()
    if not unassigned_sources:
        print("No new sources to cluster.")
        return 0
        
    embeddings_list = []
    valid_sources = []
    
    for s in unassigned_sources:
        # Check if already embedded
        existing_emb = db.query(NewsEmbedding).filter(NewsEmbedding.source_id == s.id).first()
        if existing_emb and existing_emb.embedding:
            emb = np.array(existing_emb.embedding)
        else:
            # Combine title and full content for better semantic understanding
            content_row = db.query(NewsContent).filter(NewsContent.source_id == s.id).first()
            content_text = content_row.cleaned_content if content_row and content_row.cleaned_content else (s.description or "")
            text_to_embed = f"{s.title}. {content_text[:1000]}" # Limit to first 1000 chars for embedding speed
            emb = model.encode(text_to_embed)
            
            # Save embedding
            new_emb = NewsEmbedding(
                source_id=s.id,
                embedding=emb.tolist(),
                model_name='all-MiniLM-L6-v2',
                created_at=datetime.utcnow()
            )
            db.add(new_emb)
            db.commit()
            
        embeddings_list.append(emb)
        valid_sources.append(s)
        
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
        
        topic = Topic(
            title=main_source.title, # Naive topic title
            category=None, # Will let AI refine later or keep null
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
        
    prompt_emb = model.encode(user_prompt)
    
    scored_sources = []
    for s in sources:
        # Get content text
        content_row = db.query(NewsContent).filter(NewsContent.source_id == s.id).first()
        content_text = content_row.cleaned_content if content_row and content_row.cleaned_content else (s.description or "")
        text_to_embed = f"{s.title}. {content_text[:1000]}"
        
        # Check existing embedding or encode
        existing_emb = db.query(NewsEmbedding).filter(NewsEmbedding.source_id == s.id).first()
        if existing_emb and existing_emb.embedding:
            src_emb = np.array(existing_emb.embedding)
        else:
            src_emb = model.encode(text_to_embed)
            
        sim = float(cosine_similarity([prompt_emb], [src_emb])[0][0])
        scored_sources.append((sim, s))
        
    # Sort descending by similarity
    scored_sources.sort(key=lambda x: x[0], reverse=True)
    
    # Return top_k sources
    relevant = [s for score, s in scored_sources if score >= 0.20]
    if not relevant:
        relevant = [s for score, s in scored_sources[:top_k]] # Fallback to top_k
        
    return relevant[:top_k]

