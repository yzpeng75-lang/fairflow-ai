from __future__ import annotations

import math
import re
from collections import Counter, defaultdict


TOKEN_PATTERN = re.compile(r"[a-z]+(?:_[a-z]+)?|\d+(?:\.\d+)?|[\u4e00-\u9fff]", re.IGNORECASE)


def tokenize(text: str) -> list[str]:
    return TOKEN_PATTERN.findall(text.casefold())


class MultinomialNaiveBayes:
    """Small reproducible text baseline with Laplace smoothing."""

    def __init__(self, alpha: float = 1.0) -> None:
        self.alpha = alpha
        self.class_docs: Counter[str] = Counter()
        self.class_tokens: dict[str, Counter[str]] = defaultdict(Counter)
        self.vocabulary: set[str] = set()

    def fit(self, documents: list[str], labels: list[str]) -> "MultinomialNaiveBayes":
        if not documents or len(documents) != len(labels):
            raise ValueError("documents and labels must be non-empty and aligned")
        for document, label in zip(documents, labels):
            tokens = tokenize(document)
            self.class_docs[label] += 1
            self.class_tokens[label].update(tokens)
            self.vocabulary.update(tokens)
        return self

    def predict_one(self, document: str) -> str:
        if not self.class_docs:
            raise ValueError("fit must be called before predict")
        counts = Counter(tokenize(document))
        total_docs = sum(self.class_docs.values())
        vocabulary_size = max(len(self.vocabulary), 1)
        scores: dict[str, float] = {}
        for label in sorted(self.class_docs):
            score = math.log(self.class_docs[label] / total_docs)
            token_total = sum(self.class_tokens[label].values())
            denominator = token_total + self.alpha * vocabulary_size
            for token, count in counts.items():
                numerator = self.class_tokens[label][token] + self.alpha
                score += count * math.log(numerator / denominator)
            scores[label] = score
        return max(scores, key=scores.get)

    def predict(self, documents: list[str]) -> list[str]:
        return [self.predict_one(document) for document in documents]

