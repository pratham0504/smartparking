// Add this after map initialization but before return statement

// Add parking markers effect
useEffect(() => {
  if (map.current && filteredParkings.length > 0) {
    // Remove existing markers
    if (markersRef.current.parkingMarkers) {
      markersRef.current.parkingMarkers.forEach(marker => marker.remove());
    }
    markersRef.current.parkingMarkers = [];

    // Add markers for filtered parking locations
    filteredParkings.forEach(parking => {
      // Create marker element
      const el = document.createElement('div');
      el.className = 'parking-marker';
      el.innerHTML = `
        <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg transform hover:scale-110 transition-transform">
          P
        </div>
      `;

      // Get status based on capacity
      const getStatus = () => {
        if (parking.capacity.fourWheeler > 100) return 'high';
        if (parking.capacity.fourWheeler > 50) return 'medium';
        return 'low';
      };

      // Add status class
      el.classList.add(`status-${getStatus()}`);

      // Create and store marker
      const marker = new mapboxgl.Marker(el)
        .setLngLat(parking.coordinates)
        .setPopup(
          new mapboxgl.Popup({ offset: 25 })
            .setHTML(`
              <div class="p-2 max-w-sm">
                <h3 class="font-bold text-lg">${parking.name}</h3>
                <p class="text-sm text-gray-600 mb-2">${parking.address}</p>
                <div class="mb-2">
                  <span class="font-semibold">Type:</span> ${parking.type}
                </div>
                <div class="mb-2">
                  <span class="font-semibold">Capacity:</span>
                  <br />
                  2W: ${parking.capacity.twoWheeler}
                  <br />
                  4W: ${parking.capacity.fourWheeler}
                  ${parking.capacity.lcv !== '0' ? `<br />LCV: ${parking.capacity.lcv}` : ''}
                  ${parking.capacity.hmv !== '0' ? `<br />HMV: ${parking.capacity.hmv}` : ''}
                </div>
                <div class="text-sm text-gray-600">
                  ${parking.freeParking ? 
                    '<span class="text-green-600 font-semibold">Free Parking Available</span>' : 
                    `Price Category: ${parking.pricing}`
                  }
                </div>
              </div>
            `)
        )
        .addTo(map.current);

      // Add click handler
      el.addEventListener('click', () => {
        setActiveParking(parking);
      });

      // Store marker reference
      markersRef.current.parkingMarkers.push(marker);
    });

    // Fit bounds to show all markers if we have filtered parkings
    if (filteredParkings.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      filteredParkings.forEach(parking => {
        bounds.extend(parking.coordinates);
      });
      map.current.fitBounds(bounds, {
        padding: 50
      });
    }
  }
}, [filteredParkings, map.current]);