from chromadb import HttpClient

client = HttpClient(host="localhost", port=8000)
users = client.get_or_create_collection("users")
users.add(
    documents=["Admin user", "Regular user"],
    metadatas=[
        {"email": "admin@example.com", "role": "admin"},
        {"email": "user@example.com", "role": "user"}
    ],
    ids=["admin1", "user1"]
)
print("Users added with roles")