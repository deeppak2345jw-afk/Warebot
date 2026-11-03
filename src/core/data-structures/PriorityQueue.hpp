#pragma once

#include <vector>
#include <optional>
#include <cstddef>
#include <functional>
#include <utility>

namespace robofleet {

template <typename T>
struct PriorityNode {
    T item;
    double priority;
};
template <typename T>
class PriorityQueue {
private:
    std::vector<PriorityNode<T>> heap;
    void bubbleUp(size_t index) 
    {
        while (index > 0) 
        {
            size_t parentIndex = (index - 1) / 2;
            if (heap[index].priority >= heap[parentIndex].priority) 
            {
                break;
            }
            std::swap(heap[index], heap[parentIndex]);
            index = parentIndex;
        }
    }
    void bubbleDown(size_t index) {
        size_t length = heap.size();
        while (true) 
        {
            size_t leftChildIdx = 2 * index + 1;
            size_t rightChildIdx = 2 * index + 2;
            size_t swapIdx = index;
            if (leftChildIdx < length && heap[leftChildIdx].priority < heap[swapIdx].priority) 
            {
                swapIdx = leftChildIdx;
            }
            if (rightChildIdx < length && heap[rightChildIdx].priority < heap[swapIdx].priority) 
            {
                swapIdx = rightChildIdx;
            }
            if (swapIdx == index) 
            {
                break;
            }
            std::swap(heap[index], heap[swapIdx]);
            index = swapIdx;
        }
    }
public:
    PriorityQueue() = default;
    void enqueue(const T& item, double priority) 
    {
        heap.push_back({ item, priority });
        bubbleUp(heap.size() - 1);
    }
    void enqueue(T&& item, double priority) 
    {
        heap.push_back({ std::move(item), priority });
        bubbleUp(heap.size() - 1);
    }
    std::optional<T> dequeue() 
    {
        if (isEmpty()) return std::nullopt;
        T minItem = std::move(heap[0].item);
        PriorityNode<T> end = std::move(heap.back());
        heap.pop_back();
        if (!heap.empty()) 
        {
            heap[0] = std::move(end);
            bubbleDown(0);
        }
        return minItem;
    }
    const T* peek() const 
    {
        if (isEmpty()) return nullptr;
        return &heap[0].item;
    }
    std::optional<double> peekPriority() const
    {
        if (isEmpty()) return std::nullopt;
        return heap[0].priority;
    }
    size_t size() const 
    {
        return heap.size();
    }
    bool isEmpty() const 
    {
        return heap.empty();
    }
    void clear() 
    {
        heap.clear();
    }
    std::vector<PriorityNode<T>> toVector() const 
    {
        return heap;
    }
    bool has(const std::function<bool(const T&)>& predicate) const {
        for (const auto& node : heap) 
        {
            if (predicate(node.item)) 
            {
                return true;
            }
        }
        return false;
    }
};
}
