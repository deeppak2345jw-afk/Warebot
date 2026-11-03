#pragma once

#include <vector>
#include <string>
#include <unordered_map>
#include <optional>
#include <sstream>
#include <algorithm>
#include "types.hpp"

namespace robofleet 
{
struct Edge 
{
    std::string fromId;
    std::string toId;
    double weight = 1.0;
};
struct NeighborResult 
{
    const WarehouseNode* node;
    double weight;
};
class Graph 
{
private:
    std::unordered_map<std::string, WarehouseNode> nodes;
    std::unordered_map<std::string, std::vector<Edge>> adjacencyList;
    std::unordered_map<std::string, std::string> coordToId;
public:
    Graph() = default;

    static std::string coordKey(int x, int y) 
    {
        return std::to_string(x) + "," + std::to_string(y);
    }

    void addNode(const WarehouseNode& node) 
    {
        nodes[node.id] = node;
        coordToId[coordKey(node.x, node.y)] = node.id;
        if (adjacencyList.find(node.id) == adjacencyList.end()) 
        {
            adjacencyList[node.id] = {};
        }
    }

    void addEdge(const std::string& fromId, const std::string& toId, double weight = 1.0) 
    {
        if (nodes.find(fromId) == nodes.end() || nodes.find(toId) == nodes.end()) 
        {
            return;
        }

        auto& edges = adjacencyList[fromId];
        for (const auto& e : edges) 
        {
            if (e.toId == toId) return; 
        }
        edges.push_back({ fromId, toId, weight });
    }

    void addBidirectionalEdge(const std::string& id1, const std::string& id2, double weight = 1.0) 
    {
        addEdge(id1, id2, weight);
        addEdge(id2, id1, weight);
    }

    const WarehouseNode* getNode(const std::string& nodeId) const 
    {
        auto it = nodes.find(nodeId);
        return it != nodes.end() ? &(it->second) : nullptr;
    }

    WarehouseNode* getNode(const std::string& nodeId) 
    {
        auto it = nodes.find(nodeId);
        return it != nodes.end() ? &(it->second) : nullptr;
    }

    const WarehouseNode* getNodeByCoord(int x, int y) const 
    {
        auto it = coordToId.find(coordKey(x, y));
        if (it == coordToId.end()) return nullptr;
        return getNode(it->second);
    }

    WarehouseNode* getNodeByCoord(int x, int y) 
    {
        auto it = coordToId.find(coordKey(x, y));
        if (it == coordToId.end()) return nullptr;
        return getNode(it->second);
    }

    void setBlocked(const std::string& nodeId, bool blocked) 
    {
        auto* n = getNode(nodeId);
        if (n) 
        {
            n->isBlocked = blocked;
        }
    }

    void setReserved(const std::string& nodeId, const std::optional<std::string>& robotId) 
    {
        auto* n = getNode(nodeId);
        if (n) 
        {
            n->reservedBy = robotId;
        }
    }

    std::vector<const WarehouseNode*> getAllNodes() const 
    {
        std::vector<const WarehouseNode*> result;
        result.reserve(nodes.size());
        for (const auto& [_, node] : nodes) 
        {
            result.push_back(&node);
        }
        return result;
    }

    std::vector<NeighborResult> getNeighbors
    (
        const std::string& nodeId,
        const PathfindingOptions& options = {}
    ) 
    const 
    {
        std::vector<NeighborResult> results;
        auto adjIt = adjacencyList.find(nodeId);
        if (adjIt == adjacencyList.end()) return results;

        const WarehouseNode* currentNode = getNode(nodeId);
        if (!currentNode) return results;

        const auto& edges = adjIt->second;
        results.reserve(edges.size());

        for (const auto& edge : edges) 
        {
            const WarehouseNode* neighbor = getNode(edge.toId);
            if (!neighbor) continue;
            if (options.navigationMode == NavigationMode::NORMAL_TASK) 
            {
                if (currentNode->isDockingZone || currentNode->y < 2) 
                {
                    if (neighbor->y < currentNode->y) continue;
                    if (currentNode->y == 0 && (neighbor->y != 1 || neighbor->x != currentNode->x)) continue;
                    if (currentNode->y == 1 && (neighbor->y != 2 || neighbor->x != currentNode->x)) continue;
                } 
                else 
                {
                    if (neighbor->isDockingZone || neighbor->type == NodeType::CHARGING) 
                    {
                        continue;
                    }
                }
            }
            if (!options.ignoreBlocked && neighbor->isBlocked)
            {
                continue;
            }
            if (!options.ignoreReserved && neighbor->reservedBy.has_value()) 
            {
                if (!options.reservedForRobotId.has_value() || *(neighbor->reservedBy) != *(options.reservedForRobotId)) 
                {
                    bool isGoal = options.goalCoord.has_value() &&
                                  neighbor->x == options.goalCoord->x &&
                                  neighbor->y == options.goalCoord->y;
                    if (!isGoal) continue;
                }
            }
            double edgeWeight = edge.weight;
            bool isGoal = options.goalCoord.has_value() &&
                          neighbor->x == options.goalCoord->x &&
                          neighbor->y == options.goalCoord->y;

            if (currentNode->isTwoWayCorridor && neighbor->isTwoWayCorridor) 
            {
                int dx = neighbor->x - currentNode->x;
                int dy = neighbor->y - currentNode->y;
                TrafficDirection stepDir = TrafficDirection::ANY;
                if (dx > 0) stepDir = TrafficDirection::EAST;
                else if (dx < 0) stepDir = TrafficDirection::WEST;
                else if (dy > 0) stepDir = TrafficDirection::SOUTH;
                else if (dy < 0) stepDir = TrafficDirection::NORTH;

                if (neighbor->trafficDirection != TrafficDirection::ANY &&
                    neighbor->trafficDirection != TrafficDirection::BIDIRECTIONAL) {
                    if (stepDir != TrafficDirection::ANY && neighbor->trafficDirection != stepDir && !isGoal) 
                    {
                        if (options.allowOppositeLane) 
                        {
                            edgeWeight += 25.0; 
                        } 
                        else 
                        {
                            edgeWeight += 80.0; // 
                        }
                    }
                }
                if (currentNode->corridorId.has_value() && neighbor->corridorId.has_value() &&
                    *(currentNode->corridorId) == *(neighbor->corridorId) &&
                    currentNode->laneId != neighbor->laneId &&
                    !currentNode->isIntersection && !neighbor->isIntersection &&
                    !isGoal) 
                {
                    edgeWeight += 12.0;
                }
            }

            results.push_back({ neighbor, edgeWeight });
        }

        return results;
    }
};

}
