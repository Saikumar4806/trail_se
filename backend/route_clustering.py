import sys
import json
import math
from sklearn.cluster import KMeans


def calculate_distance(p1, p2):
    """Euclidean distance between two lat/lng points."""
    return math.sqrt((p1[0] - p2[0])**2 + (p1[1] - p2[1])**2)


def optimize_route(cluster_points):
    """Sorts points using the Nearest Neighbor algorithm for shortest path."""
    if not cluster_points:
        return []

    unvisited = cluster_points[1:]
    current_point = cluster_points[0]
    route = [current_point]

    while unvisited:
        nearest = min(unvisited, key=lambda p: calculate_distance(
            (current_point["latitude"], current_point["longitude"]),
            (p["latitude"], p["longitude"])
        ))
        route.append(nearest)
        unvisited.remove(nearest)
        current_point = nearest

    return route


def main():
    input_data = sys.stdin.read()
    if not input_data:
        print(json.dumps([]))
        return

    data = json.loads(input_data)
    orders = data.get("orders", [])
    k = data.get("k", 1)

    if not orders:
        print(json.dumps([]))
        return

    # Adjust k if more partners than orders
    k = min(k, len(orders))
    if k < 1:
        k = 1

    # Extract coordinates for clustering
    coords = [[o["latitude"], o["longitude"]] for o in orders]

    # Apply K-Means Clustering
    kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
    kmeans.fit(coords)

    # Group orders by cluster
    clusters = {i: [] for i in range(k)}
    for i, label in enumerate(kmeans.labels_):
        clusters[int(label)].append(orders[i])

    # Apply Nearest Neighbor route optimization to each cluster
    final_assignments = []
    for cluster_id, cluster_orders in clusters.items():
        optimized_route = optimize_route(cluster_orders)
        final_assignments.append({
            "cluster_id": int(cluster_id),
            "total_orders": len(optimized_route),
            "route": optimized_route
        })

    print(json.dumps(final_assignments))


if __name__ == "__main__":
    main()
