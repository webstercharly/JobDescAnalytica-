import re
from collections import Counter
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

def preprocess_text(text):
    text = text.lower()
    text = re.sub(r'[^\w\s]', '', text)
    text = re.sub(r'\d+', '', text)
    return text

def extract_keywords(texts):
    # Tokenize and extract keywords using TF-IDF
    vectorizer = TfidfVectorizer(tokenizer=lambda x: x.split(), preprocessor=preprocess_text)
    X = vectorizer.fit_transform(texts)
    feature_names = vectorizer.get_feature_names()
    tfidf_scores = dict(zip(feature_names, X.mean(axis=0).tolist()[0]))
    return Counter(tfidf_scores).most_common(10)

def calculate_cosine_similarity(texts):
    vectorizer = TfidfVectorizer(tokenizer=lambda x: x.split(), preprocessor=preprocess_text)
    X = vectorizer.fit_transform(texts)
    return cosine_similarity(X[0:1], X)

# Example usage
texts = [
    "Software Engineer responsible for building and maintaining complex software systems.",
    "Develop and implement software solutions to meet customer requirements.",
    "Design, develop, and test software applications.",
]

keywords = extract_keywords(texts)
print("Keywords:", keywords)

similarities = calculate_cosine_similarity(texts)
print("Similarities:", similarities)
