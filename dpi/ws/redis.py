import redis


class Redis_Manager:
    def __init__(self, host='localhost', port=6379, db=0):
        self.redis_client = redis.Redis(host=host, port=port, db=db)

    def set(self, key, value):
        self.redis_client.set(key, value)

    def get(self, key):
        return self.redis_client.get(key)

    def delete(self, key):
        self.redis_client.delete(key)