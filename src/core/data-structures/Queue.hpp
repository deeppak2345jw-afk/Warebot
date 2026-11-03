#pragma once

#include <vector>
#include <optional>
#include <cstddef>
#include <functional>
#include <utility>

namespace robofleet 
{
template <typename T>
class Queue 
{
private:
    std::vector<T> items;
    size_t head = 0;
public:
    Queue() = default;
    explicit Queue(const std::vector<T>& initialItems) : items(initialItems), head(0) {}
    void enqueue(const T& item) 
    {
        items.push_back(item);
    }
    void enqueue(T&& item) 
    {
        items.push_back(std::move(item));
    }
    std::optional<T> dequeue() 
    {
        if (isEmpty()) return std::nullopt;
        T item = std::move(items[head]);
        head++;
        if (head > 100 && head * 2 >= items.size()) 
        {
            items.erase(items.begin(), items.begin() + head);
            head = 0;
        }
        return item;
    }
    const T* peek() const 
    {
        if (isEmpty()) return nullptr;
        return &items[head];
    }
    size_t size() const 
    {
        return items.size() - head;
    }
    bool isEmpty() const 
    {
        return size() == 0;
    }
    void clear() 
    {
        items.clear();
        head = 0;
    }
    std::vector<T> toVector() const 
    {
        return std::vector<T>(items.begin() + head, items.end());
    }
    bool remove(const std::function<bool(const T&)>& predicate) {
        for (size_t i = head; i < items.size(); ++i) 
        {
            if (predicate(items[i])) 
            {
                items.erase(items.begin() + i);
                return true;
            }
        }
        return false;
    }
    std::optional<T> find(const std::function<bool(const T&)>& predicate) const {
        for (size_t i = head; i < items.size(); ++i) 
        {
            if (predicate(items[i])) 
            {
                return items[i];
            }
        }
        return std::nullopt;
    }
};
} 
