#pragma once

#include <vector>
#include <optional>
#include <cstddef>
#include <algorithm>
#include <utility>

namespace robofleet 
{
template <typename T>
class Stack {
private:
    std::vector<T> items;
public:
    Stack() = default;
    explicit Stack(const std::vector<T>& initialItems) : items(initialItems) {}
    void push(const T& item) 
    {
        items.push_back(item);
    }
    void push(T&& item) 
    {
        items.push_back(std::move(item));
    }
    std::optional<T> pop() 
    {
        if (items.empty()) return std::nullopt;
        T val = std::move(items.back());
        items.pop_back();
        return val;
    }
    const T* peek() const 
    {
        if (items.empty()) return nullptr;
        return &items.back();
    }
    bool isEmpty() const 
    {
        return items.empty();
    }
    size_t size() const 
    {
        return items.size();
    }
    void clear() 
    {
        items.clear();
    }

    std::vector<T> toVector() const 
    {
        return items;
    }
    std::vector<T> toVectorReversed() const 
    {
        std::vector<T> reversed = items;
        std::reverse(reversed.begin(), reversed.end());
        return reversed;
    }
};
}
