#pragma once

#include <vector>
#include <list>
#include <string>
#include <optional>
#include <cstddef>
#include <cmath>
#include <functional>
#include <utility>

namespace robofleet 
{
struct HashMapMetrics 
{
    size_t size = 0;
    size_t accessCount = 0;
    size_t hitCount = 0;
    size_t missCount = 0;
    double hitRate = 100.0;
};
template <typename K, typename V>
struct HashEntry 
{
    K key;
    V value;
};
template <typename K, typename V, typename Hash = std::hash<K>>
class HashMap 
{
private:
    size_t bucketCount = 16;
    size_t elementCount = 0;
    float maxLoadFactor = 0.75f;
    std::vector<std::list<HashEntry<K, V>>> buckets;
    Hash hasher;
    mutable size_t accessCount = 0;
    mutable size_t hitCount = 0;
    mutable size_t missCount = 0;
    size_t getBucketIndex(const K& key) const 
    {
        return hasher(key) % bucketCount;
    }
    void rehash(size_t newBucketCount) 
    {
        std::vector<std::list<HashEntry<K, V>>> newBuckets(newBucketCount);
        for (auto& bucket : buckets) 
        {
            for (auto& entry : bucket) 
            {
                size_t newIdx = hasher(entry.key) % newBucketCount;
                newBuckets[newIdx].push_back(std::move(entry));
            }
        }
        buckets = std::move(newBuckets);
        bucketCount = newBucketCount;
    }
public:
    explicit HashMap(size_t initialCapacity = 16, float loadFactor = 0.75f)
        : bucketCount(initialCapacity > 0 ? initialCapacity : 16),
          maxLoadFactor(loadFactor),
          buckets(bucketCount) {}
    HashMap(const std::vector<std::pair<K, V>>& entries)
        : bucketCount(entries.size() > 8 ? entries.size() * 2 : 16),
          buckets(bucketCount) 
          {
        for (const auto& [k, v] : entries) 
        {
            set(k, v);
        }
    }
    void set(const K& key, const V& value) 
    {
        if (static_cast<float>(elementCount + 1) / bucketCount > maxLoadFactor) 
        {
            rehash(bucketCount * 2);
        }
        size_t idx = getBucketIndex(key);
        for (auto& entry : buckets[idx]) 
        {
            if (entry.key == key) 
            {
                entry.value = value;
                return;
            }
        }
        buckets[idx].push_back({ key, value });
        elementCount++;
    }
    void set(const K& key, V&& value) {
        if (static_cast<float>(elementCount + 1) / bucketCount > maxLoadFactor) 
        {
            rehash(bucketCount * 2);
        }
        size_t idx = getBucketIndex(key);
        for (auto& entry : buckets[idx]) 
        {
            if (entry.key == key) 
            {
                entry.value = std::move(value);
                return;
            }
        }
        buckets[idx].push_back({ key, std::move(value) });
        elementCount++;
    }
    std::optional<V> get(const K& key) const {
        accessCount++;
        size_t idx = getBucketIndex(key);
        for (const auto& entry : buckets[idx]) 
        {
            if (entry.key == key) 
            {
                hitCount++;
                return entry.value;
            }
        }
        missCount++;
        return std::nullopt;
    }
    const V* find(const K& key) const {
        accessCount++;
        size_t idx = getBucketIndex(key);
        for (const auto& entry : buckets[idx]) 
        {
            if (entry.key == key) 
            {
                hitCount++;
                return &entry.value;
            }
        }
        missCount++;
        return nullptr;
    }
    V* find(const K& key) 
    {
        accessCount++;
        size_t idx = getBucketIndex(key);
        for (auto& entry : buckets[idx]) 
        {
            if (entry.key == key) 
            {
                hitCount++;
                return &entry.value;
            }
        }
        missCount++;
        return nullptr;
    }
    bool has(const K& key) const 
    {
        size_t idx = getBucketIndex(key);
        for (const auto& entry : buckets[idx]) 
        {
            if (entry.key == key) 
            {
                return true;
            }
        }
        return false;
    }
    bool erase(const K& key) 
    {
        size_t idx = getBucketIndex(key);
        auto& bucket = buckets[idx];
        for (auto it = bucket.begin(); it != bucket.end(); ++it) 
        {
            if (it->key == key) 
            {
                bucket.erase(it);
                elementCount--;
                return true;
            }
        }
        return false;
    }
    void clear() {
        for (auto& b : buckets) 
        {
            b.clear();
        }
        elementCount = 0;
        accessCount = 0;
        hitCount = 0;
        missCount = 0;
    }
    size_t size() const 
    {
        return elementCount;
    }
    bool empty() const 
    {
        return elementCount == 0;
    }
    std::vector<K> keys() const 
    {
        std::vector<K> result;
        result.reserve(elementCount);
        for (const auto& bucket : buckets) 
        {
            for (const auto& entry : bucket) 
            {
                result.push_back(entry.key);
            }
        }
        return result;
    }
    std::vector<V> values() const 
    {
        std::vector<V> result;
        result.reserve(elementCount);
        for (const auto& bucket : buckets) 
        {
            for (const auto& entry : bucket) 
            {
                result.push_back(entry.value);
            }
        }
        return result;
    }
    std::vector<std::pair<K, V>> entries() const 
    {
        std::vector<std::pair<K, V>> result;
        result.reserve(elementCount);
        for (const auto& bucket : buckets) 
        {
            for (const auto& entry : bucket) 
            {
                result.push_back({ entry.key, entry.value });
            }
        }
        return result;
    }
    HashMapMetrics getMetrics() const 
    {
        double rate = accessCount > 0 ? (static_cast<double>(hitCount) / accessCount) * 100.0 : 100.0;
        return 
        {
            elementCount,
            accessCount,
            hitCount,
            missCount,
            std::round(rate * 10.0) / 10.0
        };
    }
};
}
