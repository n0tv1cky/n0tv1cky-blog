#!/bin/bash

# Script to update the blog platform every midnight
# Pulls latest changes and restarts production containers

LOG_FILE="/home/n0tv1cky/n0tv1cky-blog/scripts/update-prod.log"

cd /home/n0tv1cky/n0tv1cky-blog

echo "=== Update started at $(date) ===" >> "$LOG_FILE"

echo "Pulling latest changes from git..." >> "$LOG_FILE"
GIT_OUTPUT=$(git pull 2>&1)
echo "$GIT_OUTPUT" >> "$LOG_FILE"

echo "Starting production containers..." >> "$LOG_FILE"
if make prod-up >> "$LOG_FILE" 2>&1; then
    echo "Build succeeded at $(date)" >> "$LOG_FILE"
else
    echo "Build failed at $(date) - full logs above" >> "$LOG_FILE"
fi

echo "Update complete at $(date)" >> "$LOG_FILE"