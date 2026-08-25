"""
Simple trust/poisoning-detection layer for RAG retrieval.

Approach: retrieved chunks should have similar relevance (distance) to the
query. A chunk whose distance is a statistical outlier compared to the rest
is flagged as suspicious - it may be irrelevant or injected ("poisoned")
content that slipped into the top-k results.
"""

import statistics


def score_trust(distances: list[float]) -> dict:
    if len(distances) < 2:
        return {"trust_score": 1.0, "flagged_indices": []}

    mean = statistics.mean(distances)
    stdev = statistics.stdev(distances)

    flagged = []
    for i, d in enumerate(distances):
        # Flag chunks whose distance is notably worse (higher) than the mean
        if stdev > 0 and (d - mean) > 1.0 * stdev:
            flagged.append(i)

    # Trust score: 1.0 = all chunks consistent, lower = more outliers found
    trust_score = round(1.0 - (len(flagged) / len(distances)), 2)

    return {"trust_score": trust_score, "flagged_indices": flagged}