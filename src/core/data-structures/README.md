# Warebots Core Data Structures (C++ Implementation)

All data structures in this directory are implemented **exclusively in modern C++ (C++20)**:

- [`Graph.hpp`](Graph.hpp) - Graph with Adjacency List, warehouse navigation rules, and two-way corridor lane discipline (+80.0 penalty).
- [`HashMap.hpp`](HashMap.hpp) - Custom separate-chaining Hash Table with dynamic rehashing and real-time operational hit/miss metrics.
- [`PriorityQueue.hpp`](PriorityQueue.hpp) - Binary Min-Heap Priority Queue with $O(\log N)$ enqueue/dequeue and custom comparator.
- [`LinkedList.hpp`](LinkedList.hpp) - Doubly Linked List with $O(1)$ append/prepend/shift/pop and RAII memory safety.
- [`Queue.hpp`](Queue.hpp) - Dynamic FIFO Queue with amortized $O(1)$ operations and predicate removal.
- [`Stack.hpp`](Stack.hpp) - LIFO Stack with $O(1)$ push/pop/peek.
- [`types.hpp`](types.hpp) - Shared coordinate, traffic direction, and navigation mode types.

## Compile & Run C++ Tests

```powershell
g++ -std=c++20 -O2 -o test_ds.exe test_data_structures.cpp
.\test_ds.exe
```

Or using `make`:
```powershell
make run
```
