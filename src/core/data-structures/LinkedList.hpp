#pragma once

#include <vector>
#include <optional>
#include <cstddef>
#include <utility>

namespace robofleet 
{
template <typename T>
class ListNode 
{
public:
    T value;
    ListNode<T>* next = nullptr;
    ListNode<T>* prev = nullptr;
    explicit ListNode(const T& val) : value(val) {}
    explicit ListNode(T&& val) : value(std::move(val)) {}
};
template <typename T>
class LinkedList 
{
private:
    ListNode<T>* head = nullptr;
    ListNode<T>* tail = nullptr;
    size_t count = 0;
public:
    LinkedList() = default;
    LinkedList(const std::vector<T>& initialItems) 
    {
        for (const auto& item : initialItems) 
        {
            append(item);
        }
    }
    ~LinkedList() 
    {
        clear();
    }

    LinkedList(const LinkedList& other) 
    {
        for (auto curr = other.head; curr != nullptr; curr = curr->next) 
        {
            append(curr->value);
        }
    }

    LinkedList& operator=(const LinkedList& other) 
    {
        if (this != &other) 
        {
            clear();
            for (auto curr = other.head; curr != nullptr; curr = curr->next) 
            {
                append(curr->value);
            }
        }
        return *this;
    }
    LinkedList(LinkedList&& other) noexcept
        : head(other.head), tail(other.tail), count(other.count) 
        {
        other.head = nullptr;
        other.tail = nullptr;
        other.count = 0;
    }
    LinkedList& operator=(LinkedList&& other) noexcept 
    {
        if (this != &other) 
        {
            clear();
            head = other.head;
            tail = other.tail;
            count = other.count;
            other.head = nullptr;
            other.tail = nullptr;
            other.count = 0;
        }
        return *this;
    }
    void append(const T& value) {
        auto* newNode = new ListNode<T>(value);
        if (!tail) 
        {
            head = newNode;
            tail = newNode;
        } 
        else 
        {
            tail->next = newNode;
            newNode->prev = tail;
            tail = newNode;
        }
        count++;
    }
    void append(T&& value) 
    {
        auto* newNode = new ListNode<T>(std::move(value));
        if (!tail) 
        {
            head = newNode;
            tail = newNode;
        } 
        else 
        {
            tail->next = newNode;
            newNode->prev = tail;
            tail = newNode;
        }
        count++;
    }
    void prepend(const T& value)
    {
        auto* newNode = new ListNode<T>(value);
        if (!head) 
        {
            head = newNode;
            tail = newNode;
        } 
        else 
        {
            newNode->next = head;
            head->prev = newNode;
            head = newNode;
        }
        count++;
    }

    std::optional<T> shift() 
    {
        if (!head) return std::nullopt;
        T val = std::move(head->value);
        ListNode<T>* toDelete = head;
        head = head->next;
        if (head) 
        {
            head->prev = nullptr;
        } 
        else 
        {
            tail = nullptr;
        }
        delete toDelete;
        count--;
        return val;
    }
    std::optional<T> pop() {
        if (!tail) return std::nullopt;
        T val = std::move(tail->value);
        ListNode<T>* toDelete = tail;
        tail = tail->prev;
        if (tail) 
        {
            tail->next = nullptr;
        } 
        else 
        {
            head = nullptr;
        }
        delete toDelete;
        count--;
        return val;
    }
    const T* peekFirst() const {
        return head ? &(head->value) : nullptr;
    }
    const T* peekLast() const {
        return tail ? &(tail->value) : nullptr;
    }
    size_t size() const {
        return count;
    }
    bool isEmpty() const {
        return count == 0;
    }
    void clear() {
        ListNode<T>* current = head;
        while (current) 
        {
            ListNode<T>* next = current->next;
            delete current;
            current = next;
        }
        head = nullptr;
        tail = nullptr;
        count = 0;
    }
    std::vector<T> toVector() const {
        std::vector<T> result;
        result.reserve(count);
        ListNode<T>* current = head;
        while (current) 
        {
            result.push_back(current->value);
            current = current->next;
        }
        return result;
    }
    std::vector<T> toVectorReversed() const 
    {
        std::vector<T> result;
        result.reserve(count);
        ListNode<T>* current = tail;
        while (current) 
        {
            result.push_back(current->value);
            current = current->prev;
        }
        return result;
    }
};
} 
