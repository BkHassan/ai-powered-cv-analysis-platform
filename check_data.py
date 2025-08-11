import chromadb

client = chromadb.HttpClient(host="localhost", port=8000)

# List all collections
collections = client.list_collections()
for col in collections:
    name = col.name
    print(f"\n=== Collection: {name} ===")
    collection = client.get_collection(name=name)
    results = collection.get(limit=100)

    print("IDs:", results.get("ids"))
    print("Documents:", results.get("documents"))
    print("Metadata:", results.get("metadatas"))
    print("Embeddings:", results.get("embeddings"))
