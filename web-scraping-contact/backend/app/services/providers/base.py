from abc import ABC, abstractmethod
from typing import List, Optional
from pydantic import BaseModel

class SearchResultItem(BaseModel):
    title: str
    url: str
    snippet: str
    source_type: str = "web_search"
    rank: int = 1

class BaseSearchProvider(ABC):
    @abstractmethod
    def search(self, query: str, max_results: int = 5) -> List[SearchResultItem]:
        """Execute search query and return list of results."""
        pass
