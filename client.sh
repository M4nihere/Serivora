#!/bin/bash

# Server URLs
LOGIN_URL="http://192.168.44.128:3000/api/login"  # Login endpoint
LOG_URL="http://192.168.44.128:3000/api/logs"     # Logs endpoint

# Credentials
USERNAME="user1"
PASSWORD="user1"

# Associative array of services and their corresponding log files
declare -A log_files=(
    ["Apache"]="/var/log/apache2/access.log"
    ["Syslog"]="/var/log/syslog"
    ["random1"]="/root/syslog-generator/random_log_1.log"
    ["random2"]="/root/syslog-generator/random_log_2.log"
    ["random3"]="/root/syslog-generator/random_log_3.log"
    # Add more services and paths as needed
)

# Unique client identifier
CLIENT_ID=$USERNAME  # Change this for each client

# Variable to store the JWT
JWT=""

# Function to log in and retrieve a JWT
login() {
    echo "Logging in to retrieve JWT..."
    response=$(curl -s -X POST "$LOGIN_URL" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"$USERNAME\", \"password\":\"$PASSWORD\"}")

    # Extract JWT from the response
    JWT=$(echo "$response" | jq -r '.token')

    if [[ "$JWT" == "null" || -z "$JWT" ]]; then
        echo "[ERROR] Failed to log in. Check your credentials."
        exit 1
    fi

    echo "[SUCCESS] Logged in successfully."
}

# Function to send a log entry
send_log() {
    local service_name=$1
    local log_text=$2
    local hostname=$(hostname)

    # JSON payload creation
    json_payload=$(jq -n \
        --arg service "$service_name" \
        --arg host "$hostname" \
        --arg clientId "$CLIENT_ID" \
        --arg text "$log_text" \
        '{serviceName: $service, host: $host, clientId: $clientId, logText: $text}')

    # Send log entry via curl
    response=$(curl -s -w "%{http_code}" -o /dev/null -X POST "$LOG_URL" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $JWT" \
        -d "$json_payload")

    # Check response status
    if [[ "$response" -eq 200 ]]; then
        echo "[SUCCESS] Log sent for service: $service_name"
    elif [[ "$response" -eq 401 ]]; then
        echo "[ERROR] Token expired or invalid. Re-authenticating..."
        login
        send_log "$service_name" "$log_text" # Retry after re-authenticating
    elif [[ "$response" -eq 403 ]]; then
        echo "[ERROR] Forbidden access for service: $service_name (HTTP $response). Attempting re-authentication..."
        login
        send_log "$service_name" "$log_text" # Retry after re-authenticating
    else
        echo "[ERROR] Failed to send log for service: $service_name (HTTP $response)"
    fi
}
# Function to tail a log file and send new entries
tail_log_file() {
    local service_name=$1
    local log_file=$2

    # Use tail -f to follow the log file
    tail -f "$log_file" | while read -r log_entry; do
        if [[ -n "$log_entry" ]]; then
            send_log "$service_name" "$log_entry"
        fi
    done
}

# Log in to retrieve the initial JWT
login

# Main log monitoring loop
for service_name in "${!log_files[@]}"; do
    log_file="${log_files[$service_name]}"

    if [[ -f "$log_file" ]]; then
        # Start tailing the log file in the background
        tail_log_file "$service_name" "$log_file" &
    else
        echo "[WARNING] Log file not found for service: $service_name ($log_file)"
    fi
done

# Wait for all background processes to finish
wait