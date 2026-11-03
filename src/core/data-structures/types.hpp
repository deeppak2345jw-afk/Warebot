#pragma once

#include <string>
#include <vector>
#include <optional>
#include <cmath>
#include <iostream>

namespace robofleet {

struct GridCoord {
    int x = 0;
    int y = 0;

    bool operator==(const GridCoord& other) const {
        return x == other.x && y == other.y;
    }

    bool operator!=(const GridCoord& other) const {
        return !(*this == other);
    }
};

enum class TrafficDirection {
    NORTH,
    SOUTH,
    EAST,
    WEST,
    BIDIRECTIONAL,
    ANY
};

inline std::string trafficDirectionToString(TrafficDirection dir) {
    switch (dir) {
        case TrafficDirection::NORTH: return "NORTH";
        case TrafficDirection::SOUTH: return "SOUTH";
        case TrafficDirection::EAST: return "EAST";
        case TrafficDirection::WEST: return "WEST";
        case TrafficDirection::BIDIRECTIONAL: return "BIDIRECTIONAL";
        case TrafficDirection::ANY: return "ANY";
    }
    return "ANY";
}

enum class NavigationMode {
    NORMAL_TASK,
    CHARGING_TASK,
    LEAVING_DOCK,
    EMERGENCY
};

enum class NodeType {
    AISLE,
    SHELF,
    DELIVERY,
    CHARGING,
    WAITING
};

struct WarehouseNode {
    std::string id;
    int x = 0;
    int y = 0;
    NodeType type = NodeType::AISLE;
    bool isBlocked = false;
    std::optional<std::string> reservedBy;
    std::string zone;
    std::optional<std::string> shelfId;
    std::optional<std::string> deliveryNodeId;
    bool isDockingZone = false;
    TrafficDirection trafficDirection = TrafficDirection::ANY;
    std::optional<std::string> laneId;
    std::optional<std::string> corridorId;
    bool isIntersection = false;
    bool isStagingNode = false;
    bool isTwoWayCorridor = false;
    std::optional<GridCoord> oppositeLaneCoord;
};

struct PathfindingOptions {
    std::string heuristic = "manhattan";
    bool ignoreReserved = true;
    std::optional<std::string> reservedForRobotId;
    std::optional<GridCoord> goalCoord;
    NavigationMode navigationMode = NavigationMode::NORMAL_TASK;
    std::optional<std::string> targetDockId;
    bool allowOppositeLane = false;
};

struct PathfindingResult {
    std::vector<GridCoord> path;
    std::vector<GridCoord> exploredNodes;
    double cost = 0.0;
    double calculationTimeMs = 0.0;
    std::string algorithm;
};

inline double calculateHeuristic(const GridCoord& a, const GridCoord& b, const std::string& type = "manhattan") {
    double dx = std::abs(a.x - b.x);
    double dy = std::abs(a.y - b.y);
    if (type == "euclidean") {
        return std::sqrt(dx * dx + dy * dy);
    }
    return dx + dy;
}

} 
