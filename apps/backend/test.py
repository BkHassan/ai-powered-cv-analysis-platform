import chromadb

# Setup Chroma in-memory, for easy prototyping. Can add persistence easily!
client = chromadb.Client()

# Create a collection (where you'll store your embeddings, documents, and metadata)
collection_name = "my_test_collection"
collection = client.get_or_create_collection(name=collection_name)

# Add some data to the collection
documents = [
    "This is the first document.",
    "Here's the second document.",
    "And this is document number three."
]
metadatas = [
    {"source": "source1", "row": 1},
    {"source": "source2", "row": 2},
    {"source": "source1", "row": 3}
]
ids = ["doc1", "doc2", "doc3"]

collection.add(
    documents=documents,
    metadatas=metadatas,
    ids=ids
)

# You can now query the collection to see if the data was added
results = collection.query(
    query_texts=["second document"],
    n_results=1
)

print(results)

# If you want to persist the data to disk:
# persistent_client = chromadb.PersistentClient(path="./chroma_db")
# persistent_collection = persistent_client.get_or_create_collection(name="my_persistent_collection")
# persistent_collection.add(...) # Add your data

# To retrieve the persisted collection later:
# loaded_client = chromadb.PersistentClient(path="./chroma_db")
# loaded_collection = loaded_client.get_collection(name="my_persistent_collection")
# loaded_results = loaded_collection.query(...)