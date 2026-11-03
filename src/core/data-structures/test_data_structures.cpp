#include <iostream>
#include <cassert>
#include <string>
#include <vector>

#include "LinkedList.hpp"
#include "Queue.hpp"
#include "Stack.hpp"
#include "PriorityQueue.hpp"
#include "HashMap.hpp"
#include "Graph.hpp"

using namespace robofleet;

int main() {
    std::cout << "=================================================================" << std::endl;
    std::cout << "🤖 WAREBOTS C++ CORE DATA STRUCTURES VERIFICATION SUITE" << std::endl;
    std::cout << "=================================================================" << std::endl;

    std::cout << "\n[1/6] Testing LinkedList<T>..." << std::endl;
    LinkedList<std::string> list;
    list.append("B");
    list.prepend("A");
    list.append("C");
    assert(list.size() == 3);
    assert(*list.shift() == "A");
    assert(*list.pop() == "C");
    assert(*list.peekFirst() == "B");
    std::cout << "  ✓ LinkedList verified." << std::endl;

    
    std::cout << "\n[2/6] Testing Queue<T>..." << std::endl;
    Queue<int> q;
    q.enqueue(10);
    q.enqueue(20);
    q.enqueue(30);
    assert(*q.dequeue() == 10);
    assert(*q.peek() == 20);
    assert(q.size() == 2);
    std::cout << "  ✓ Queue verified." << std::endl;

    
    std::cout << "\n[3/6] Testing Stack<T>..." << std::endl;
    Stack<int> s;
    s.push(1);
    s.push(2);
    assert(*s.peek() == 2);
    assert(*s.pop() == 2);
    assert(*s.pop() == 1);
    assert(s.isEmpty());
    std::cout << "  ✓ Stack verified." << std::endl;

    
    std::cout << "\n[4/6] Testing PriorityQueue<T> (Binary Min-Heap)..." << std::endl;
    PriorityQueue<std::string> pq;
    pq.enqueue("Low", 20.0);
    pq.enqueue("Critical", 1.0);
    pq.enqueue("Normal", 10.0);
    assert(*pq.dequeue() == "Critical");
    assert(*pq.dequeue() == "Normal");
    assert(*pq.dequeue() == "Low");
    std::cout << "  ✓ PriorityQueue Min-Heap verified." << std::endl;

    
    std::cout << "\n[5/6] Testing HashMap<K, V>..." << std::endl;
    HashMap<std::string, int> map;
    map.set("R-1", 100);
    map.set("R-2", 80);
    assert(map.has("R-1"));
    assert(*map.get("R-1") == 100);
    map.erase("R-2");
    assert(!map.has("R-2"));
    std::cout << "  ✓ HashMap verified." << std::endl;

    
    std::cout << "\n[6/6] Testing Graph..." << std::endl;
    Graph g;
    WarehouseNode n1; n1.id = "n1"; n1.x = 2; n1.y = 2;
    WarehouseNode n2; n2.id = "n2"; n2.x = 3; n2.y = 2;
    g.addNode(n1);
    g.addNode(n2);
    g.addBidirectionalEdge("n1", "n2", 1.0);
    auto neighbors = g.getNeighbors("n1");
    assert(neighbors.size() == 1);
    assert(neighbors[0].node->id == "n2");
    std::cout << "  ✓ Graph verified." << std::endl;

    std::cout << "\n=================================================================" << std::endl;
    std::cout << "🎉 ALL C++ DATA STRUCTURES PASSED WITH 100% SUCCESS!" << std::endl;
    std::cout << "=================================================================" << std::endl;
    return 0;
}
