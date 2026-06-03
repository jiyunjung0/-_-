// Get search button and input field elements
const searchBtn = document.getElementById('addressSearchBtn');
const addressInput = document.getElementById('addressInput');

// ★ Insert your Vworld API key here! ★
const VWORLD_API_KEY = 'ED781C53-FF4A-306E-A6DD-6A9D35D1EC34';

// Execute search on button click
searchBtn.addEventListener('click', () => {
    const address = addressInput.value.trim();
    if (!address) {
        alert("Please enter an address!");
        return;
    }
    geocodeAndMarkWithVworld(address);
});

// Trigger search on Enter key press
addressInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchBtn.click();
    }
});

// Get the reset button element
const resetBtn = document.getElementById('resetBtn');

// Add event listener for the reset button
resetBtn.addEventListener('click', () => {
    // Select all marker groups and remove them all at once
    d3.selectAll('.address-marker-group').remove();
    console.log("All markers have been removed.");
});


// 1. Function to convert address to coordinates (Vworld API - JSONP method)
function geocodeAndMarkWithVworld(address) {
    console.log("1. Search started! Entered address:", address); // For debugging in F12 console

    const callbackName = 'vworldCallback_' + Math.round(100000 * Math.random());

    window[callbackName] = function(data) {
        console.log("3. Data received from Vworld!", data); // For debugging in F12 console
        
        delete window[callbackName];
        document.getElementById(callbackName).remove();

        if (data.response.status !== 'OK' || !data.response.result) {
            alert("Address not found. Please try again with a 'road name address'! (e.g., 서울특별시 서대문구 연세로 50)");
            return;
        }

        const point = data.response.result.point;
        console.log("4. Found coordinates:", point.x, point.y); // For debugging in F12 console
        
        // Call the function to draw a marker on the map
        drawMarkerOnMap(parseFloat(point.x), parseFloat(point.y), address);
    };

    const script = document.createElement('script');
    script.id = callbackName;
    
    script.src = `https://api.vworld.kr/req/address?service=address&request=getcoord&version=2.0&crs=epsg:4326&address=${encodeURIComponent(address)}&refine=true&simple=false&format=jsonp&type=road&key=${VWORLD_API_KEY}&callback=${callbackName}`;

    script.onerror = function() {
        alert("Connection blocked by Vworld server! Please check if your URL is 127.0.0.1:5500.");
        delete window[callbackName];
        script.remove();
    };

    console.log("2. Sending data request to Vworld..."); // For debugging in F12 console
    document.body.appendChild(script);
}

// 2. Function to draw a marker on the SVG map using the converted coordinates
function drawMarkerOnMap(lng, lat, addressName) {
    // Convert coordinates to screen (pixel) coordinates using scaleX, scaleY defined in HTML
    const x = scaleX(lng);
    const y = scaleY(lat);

    const mapSvg = d3.select('#seoulMap');

    // Create a group (<g>) for the marker and text to handle them together
    const markerGroup = mapSvg.append('g')
        .attr('class', 'address-marker-group')
        .style('cursor', 'pointer') // Change cursor to pointer to indicate it's clickable
        .on('click', function() {
            // Remove this specific group when clicked
            d3.select(this).remove();
        });

// Add a marker (circle) inside the group
    markerGroup.append('circle')
        .attr('cx', x)
        .attr('cy', y)
        .attr('r', 12) // Radius increased from 8 to 12
        .attr('fill', '#3b82f6')
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 3) // Increased stroke width for better visibility
        .style('filter', 'drop-shadow(0px 2px 4px rgba(0,0,0,0.3))');

    // Add the address text inside the group
    markerGroup.append('text')
        .attr('x', x)
        .attr('y', y - 18) // Adjusted position slightly higher (y - 18) to match the larger marker
        .attr('text-anchor', 'middle')
        .attr('font-size', '22px') // Font size increased from 16px to 22px
        .attr('font-weight', '700')
        .attr('fill', '#1a202c')
        .style('paint-order', 'stroke')
        .style('stroke', 'rgba(255, 255, 255, 0.9)')
        .style('stroke-width', '4px') // Thicker outline for better readability
        .text(addressName);
        
    // Reset the input field after successful search for convenience
    document.getElementById('addressInput').value = '';
}
