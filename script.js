// DOM Elements
const zipcodeInput = document.getElementById('zipcode');
const addressInput = document.getElementById('address');
const searchBtn = document.getElementById('searchBtn');
const errorMessage = document.getElementById('errorMessage');
const loading = document.getElementById('loading');
const resultsSection = document.getElementById('resultsSection');
const resultsContainer = document.getElementById('resultsContainer');
const resultsCount = document.getElementById('resultsCount');
const noResults = document.getElementById('noResults');

// Modality checkboxes
const ichdCheckbox = document.getElementById('ichd');
const pdCheckbox = document.getElementById('pd');
const hhdCheckbox = document.getElementById('hhd');

// Haversine formula to calculate distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 3959; // Earth's radius in miles
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
}

function toRad(degrees) {
    return degrees * (Math.PI / 180);
}

// Geocode address or zip code using Nominatim API
async function geocodeLocation(query) {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=us&limit=1`,
            {
                headers: {
                    'User-Agent': 'DaVita Facility Locator'
                }
            }
        );

        if (!response.ok) {
            throw new Error('Geocoding service unavailable');
        }

        const data = await response.json();

        if (data.length === 0) {
            throw new Error('Location not found. Please check your input.');
        }

        return {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon)
        };
    } catch (error) {
        throw error;
    }
}

// Get selected modalities
function getSelectedModalities() {
    const selected = [];
    if (ichdCheckbox.checked) selected.push('ICHD');
    if (pdCheckbox.checked) selected.push('PD');
    if (hhdCheckbox.checked) selected.push('HHD');
    return selected;
}

// Filter facilities by distance and modality
function filterFacilities(userLat, userLng, maxDistance = 10) {
    const selectedModalities = getSelectedModalities();

    if (selectedModalities.length === 0) {
        throw new Error('Please select at least one modality');
    }

    const facilitiesWithDistance = facilities.map(facility => {
        const distance = calculateDistance(userLat, userLng, facility.lat, facility.lng);
        return {
            ...facility,
            distance: distance
        };
    });

    // Filter by distance and modality
    const filtered = facilitiesWithDistance.filter(facility => {
        const withinDistance = facility.distance <= maxDistance;
        const hasMatchingModality = facility.modalities.some(modality =>
            selectedModalities.includes(modality)
        );
        return withinDistance && hasMatchingModality;
    });

    // Sort by distance
    filtered.sort((a, b) => a.distance - b.distance);

    return filtered;
}

// Create results table HTML
function createResultsTable(facilities) {
    if (facilities.length === 0) return '';

    const rows = facilities.map(facility => {
        const modalityTags = facility.modalities
            .map(modality => `<span class="modality-tag">${modality}</span>`)
            .join(' ');

        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(facility.address)}`;

        return `
        <tr>
            <td>
                <div class="facility-name-cell">${facility.name}</div>
            </td>
            <td>
                <div class="facility-address-cell">${facility.address}</div>
            </td>
            <td>
                <div class="distance-cell">${facility.distance.toFixed(1)} mi</div>
            </td>
            <td>
                <div class="modalities-cell">${modalityTags}</div>
            </td>
            <td class="action-cell">
                <a href="${mapUrl}" target="_blank" rel="noopener noreferrer" class="map-link-table">
                    View on Map
                </a>
            </td>
        </tr>
        `;
    }).join('');

    return `
    <div class="table-responsive">
        <table class="results-table">
            <thead>
                <tr>
                    <th>Facility Name</th>
                    <th>Address</th>
                    <th>Distance</th>
                    <th>Modalities</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
    </div>
    `;
}

// Display results
function displayResults(filteredFacilities) {
    resultsContainer.innerHTML = '';

    if (filteredFacilities.length === 0) {
        resultsSection.classList.add('hidden');
        noResults.classList.remove('hidden');
        return;
    }

    noResults.classList.add('hidden');
    resultsSection.classList.remove('hidden');

    resultsCount.textContent = `Found ${filteredFacilities.length} ${filteredFacilities.length === 1 ? 'facility' : 'facilities'} within 10 miles`;

    resultsContainer.innerHTML = createResultsTable(filteredFacilities);
}

// Show error message
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
    setTimeout(() => {
        errorMessage.classList.add('hidden');
    }, 5000);
}

// Hide all sections
function hideAllSections() {
    loading.classList.add('hidden');
    resultsSection.classList.add('hidden');
    noResults.classList.add('hidden');
    errorMessage.classList.add('hidden');
}

// Main search function
async function performSearch() {
    const zipcode = zipcodeInput.value.trim();
    const address = addressInput.value.trim();

    // Validation
    if (!zipcode && !address) {
        showError('Please enter a zip code or address');
        return;
    }

    if (zipcode && !/^\d{5}$/.test(zipcode)) {
        showError('Please enter a valid 5-digit zip code');
        return;
    }

    try {
        hideAllSections();
        loading.classList.remove('hidden');
        searchBtn.disabled = true;

        // Determine search query
        const searchQuery = zipcode || address;

        // Geocode the location
        const userLocation = await geocodeLocation(searchQuery);

        // Filter facilities
        const filteredFacilities = filterFacilities(userLocation.lat, userLocation.lng);

        // Display results
        displayResults(filteredFacilities);

    } catch (error) {
        hideAllSections();
        showError(error.message);
    } finally {
        loading.classList.add('hidden');
        searchBtn.disabled = false;
    }
}

// Event Listeners
searchBtn.addEventListener('click', performSearch);

// Allow Enter key to trigger search
zipcodeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        performSearch();
    }
});

addressInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        performSearch();
    }
});

// Clear the other input when one is being used
zipcodeInput.addEventListener('input', () => {
    if (zipcodeInput.value) {
        addressInput.value = '';
    }
});

addressInput.addEventListener('input', () => {
    if (addressInput.value) {
        zipcodeInput.value = '';
    }
});

// Validate zip code input (numbers only)
zipcodeInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '');
});

// Re-filter results when modality checkboxes change (if results are already displayed)
[ichdCheckbox, pdCheckbox, hhdCheckbox].forEach(checkbox => {
    checkbox.addEventListener('change', () => {
        if (!resultsSection.classList.contains('hidden') || !noResults.classList.contains('hidden')) {
            // Re-run search with current location
            const currentQuery = zipcodeInput.value || addressInput.value;
            if (currentQuery) {
                performSearch();
            }
        }
    });
});
