// script.js
const output = document.getElementById('output');
const hostFilter = document.getElementById('hostFilter');
const serviceFilter = document.getElementById('serviceFilter');
const autoScrollCheckbox = document.getElementById('autoScroll'); // Added this line to correctly reference the checkbox

const logs = []; // Array to store all logs received from the WebSocket
const uniqueHosts = new Set();
const servicesByHost = {}; // Object to store services mapped to their hosts

// Connect to the WebSocket server
const socket = new WebSocket('ws://localhost:3000');

// Listen for messages from the server
socket.addEventListener('message', function (event) {
    const logEntry = JSON.parse(event.data);
    console.log('Received log:', logEntry); // Debug log
    logs.push(logEntry);

    // Add host to uniqueHosts
    if (logEntry.host) uniqueHosts.add(logEntry.host);

    // Add service to the corresponding host in servicesByHost
    if (logEntry.host && logEntry.serviceName) {
        if (!servicesByHost[logEntry.host]) {
            servicesByHost[logEntry.host] = new Set();
        }
        servicesByHost[logEntry.host].add(logEntry.serviceName);
    }

    populateHostDropdown(); // Update host dropdown dynamically
    applyFilters(); // Apply filters whenever a new log is added
    applyAutoScroll();
});

// Populate the Host dropdown
function populateHostDropdown() {
    const currentHost = hostFilter.value; // Preserve current selection
    hostFilter.innerHTML = `<option value="">All Hosts</option>`; // Default option

    uniqueHosts.forEach(host => {
        const option = document.createElement('option');
        option.value = host;
        option.textContent = host;
        hostFilter.appendChild(option);
    });

    hostFilter.value = currentHost; // Restore selection
    populateServiceDropdown(); // Update services dropdown based on current host
}

// Populate the Service dropdown based on selected Host
function populateServiceDropdown() {
    const selectedHost = hostFilter.value; // Get the selected host
    const currentService = serviceFilter.value; // Preserve current selection
    serviceFilter.innerHTML = `<option value="">All Services</option>`; // Default option

    // Get services for the selected host
    if (selectedHost && servicesByHost[selectedHost]) {
        servicesByHost[selectedHost].forEach(serviceName => {
            const option = document.createElement('option');
            option.value = serviceName;
            option.textContent = serviceName;
            serviceFilter.appendChild(option);
        });
    } else if (!selectedHost) {
        // If no host is selected, show all unique services
        const allServices = new Set();
        Object.values(servicesByHost).forEach(serviceSet => {
            serviceSet.forEach(service => allServices.add(service));
        });
        allServices.forEach(serviceName => {
            const option = document.createElement('option');
            option.value = serviceName;
            option.textContent = serviceName;
            serviceFilter.appendChild(option);
        });
    }

    serviceFilter.value = currentService; // Restore selection
}

// Apply filters and display filtered logs
function applyFilters() {
    const selectedHost = hostFilter.value;
    const selectedService = serviceFilter.value;

    // Clear existing output
    output.innerHTML = '';

    // Filter logs based on selected Host and Service Name
    const filteredLogs = logs.filter(logEntry => {
        const hostMatches = selectedHost === '' || logEntry.host === selectedHost;
        const serviceMatches = selectedService === '' || logEntry.serviceName === selectedService;
        return hostMatches && serviceMatches;
    });

    // Display the filtered logs
    if (filteredLogs.length > 0) {
        filteredLogs.forEach(displayLog);
    } else {
        const noLogsElement = document.createElement('div');
        noLogsElement.textContent = 'No logs match the selected filters.';
        output.appendChild(noLogsElement);
    }
}

// Function to display a single log entry
function displayLog(logEntry) {
    const logMessage = ` ${logEntry.clientId} - ${logEntry.host}  - ${logEntry.serviceName} : ${logEntry.logText}`;
    const logElement = document.createElement('div');
    logElement.textContent = logMessage;
    output.appendChild(logElement);
}

// Event listener for host filter change
hostFilter.addEventListener('change', () => {
    populateServiceDropdown(); // Update services based on selected host
    applyFilters(); // Apply filters
});

// Function to apply auto-scroll behavior
function applyAutoScroll() {
    if (autoScrollCheckbox.checked) {
        output.scrollTop = output.scrollHeight; // Scroll to the bottom of the output
    }
}

// Event listener for the Auto-Scroll checkbox
autoScrollCheckbox.addEventListener('change', () => {
    if (autoScrollCheckbox.checked) {
        applyAutoScroll(); // Scroll to the bottom when auto-scroll is enabled
    }
});

// Event listener for service filter change
serviceFilter.addEventListener('change', applyFilters);