document.addEventListener('DOMContentLoaded', function () {
    // Initialize map
    var map = L.map('map').setView([14.832638348673388, 120.28262190484067], 13);
    var routingControl = null;
    var markers = [];
    var currentMode = 'parameters';
    var activeRoute = null;

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    const centerPoint = [14.832638348673388, 120.28262190484067];
    const radius = 200;
    const points = [];
7
    for (let i = 0; i < 360; i += 15) {
        for (let r = 0; r < radius; r += 150) {
            const angle = (i * Math.PI) / 180;
            const lat = centerPoint[0] + (r / 111300) * Math.cos(angle);
            const lng = centerPoint[1] + (r / 111300) * Math.sin(angle);
            const intensity = Math.pow(1 - (r / radius), 1.5) * 0.8;
            points.push([lat, lng, intensity]);
        }
    }

    points.push([centerPoint[0], centerPoint[1], 0.8]);

    const heatmapLayer = L.heatLayer(points, {
        radius: 30,
        blur: 25,
        maxZoom: 19,
        max: 0.8,
        minOpacity: 0.3,
        gradient: {
            0.0: 'rgba(0, 255, 0, 0.3)',
            0.5: 'rgba(255, 255, 0, 0.3)',
            1.0: 'rgba(255, 0, 0, 0.3)'
        }
    }).addTo(map);

    function isInDangerZone(point) {
        const distance = map.distance(point, centerPoint);
        return distance <= radius && distance <= 800;
    }

    function clearMarkersAndRoutes() {
        markers.forEach(marker => map.removeLayer(marker));
        markers = [];
        if (routingControl) {
            map.removeControl(routingControl);
            routingControl = null;
        }

        const alternativesContainer = document.querySelector('.road-safety-mode');
        if (alternativesContainer) {
            alternativesContainer.innerHTML = createRouteFoundHTML();
        }
    }

    const parameterMode = document.querySelector('.selection-mode');
    const roadSafetyMode = document.querySelector('.selection-mode.active');
    const parameterContent = document.querySelector('.parameter-mode');
    const roadSafetyContent = document.querySelector('.road-safety-mode');

    function createRouteFoundHTML() {
        return `
            <div class="route-found-container">
                <span class="material-symbols-outlined">directions_car</span>
                <div class="route-contents-container">
                    <h1 class="route-distance-heading">Select destinations</h1>
                    <p class="route-indicator">Click two points on the map</p>
                </div>
            </div>
        `;
    }

    function updateRouteDisplay(route, intersectsDanger) {
        const routeContainer = document.querySelector('.route-found-container');
        if (routeContainer) {
            const distance = (route.summary.totalDistance / 1000).toFixed(1);
            routeContainer.querySelector('.route-distance-heading').textContent = `${distance}km away`;
            routeContainer.style.borderColor = intersectsDanger ? '#FFBC42' : '#8FE388';
            routeContainer.querySelector('.route-indicator').textContent =
                intersectsDanger ? 'Route passes through rain area' : 'Road has no signs of rain';
        }
    }

    function switchMode(mode) {
        currentMode = mode;
        if (mode === 'parameters') {
            parameterMode.classList.add('active');
            roadSafetyMode.classList.remove('active');
            if (parameterContent && roadSafetyContent) {
                parameterContent.style.display = 'block';
                roadSafetyContent.style.display = 'none';
            }
            clearMarkersAndRoutes();
        } else {
            roadSafetyMode.classList.add('active');
            parameterMode.classList.remove('active');
            if (parameterContent && roadSafetyContent) {
                parameterContent.style.display = 'none';
                roadSafetyContent.style.display = 'block';
                roadSafetyContent.innerHTML = createRouteFoundHTML();
            }
            clearMarkersAndRoutes();
        }
    }

    parameterMode.addEventListener('click', () => switchMode('parameters'));
    roadSafetyMode.addEventListener('click', () => switchMode('road-safety'));

    map.on('click', function (e) {
        if (currentMode !== 'road-safety') return;

        if (markers.length >= 2) {
            clearMarkersAndRoutes();
        }

        var marker = L.marker(e.latlng).addTo(map);
        markers.push(marker);

        if (markers.length === 2) {
            const waypoints = markers.map(marker => marker.getLatLng());

            if (routingControl) {
                map.removeControl(routingControl);
            }

            routingControl = L.Routing.control({
                waypoints: waypoints,
                routeWhileDragging: false,
                addWaypoints: false,
                draggableWaypoints: false,
                createMarker: function () { return null; }, 
                lineOptions: {
                    styles: [{ color: '#44AF69', opacity: 0.7, weight: 6 }]
                },
                show: false 
            }).addTo(map);

            routingControl.on('routesfound', function (e) {
                const route = e.routes[0];
                const intersectsDanger = route.coordinates.some(coord => isInDangerZone(coord));

                if (activeRoute) {
                    map.removeLayer(activeRoute);
                }

                activeRoute = L.polyline(route.coordinates, {
                    color: intersectsDanger ? '#FFBC42' : '#44AF69',
                    opacity: 0.7,
                    weight: 6
                }).addTo(map);

                updateRouteDisplay(route, intersectsDanger);
            });
        }
    });
    switchMode('parameters');
});