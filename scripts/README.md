# Automated Update Script

This script runs `git pull` and `make prod-up` every midnight to keep the blog platform updated with the latest changes and restart production containers.

## Files
- `update-prod.sh`: The main script that performs the update.
- `update-prod.log`: Log file where script output is appended. On success, only a timestamp and "Build succeeded" is logged. On failure, full build logs are stored for debugging.

## Cron Job
The script is scheduled to run daily at 00:00 via cron:
```
0 0 * * * /home/n0tv1cky/n0tv1cky-blog/scripts/update-prod.sh
```

## Manual Run
You can also run the script manually:
```bash
./scripts/update-prod.sh
```

## Disabling the Cron Job Temporarily
To temporarily disable the automated updates (e.g., during maintenance or testing), you can comment out or remove the cron job:

1. Edit the crontab:
   ```bash
   crontab -e
   ```

2. Comment out the line by adding `#` at the beginning:
   ```
   # 0 0 * * * /home/n0tv1cky/n0tv1cky-blog/scripts/update-prod.sh
   ```

3. Save and exit. The job will be disabled until you uncomment it.

To re-enable, remove the `#` and save.

## Notes
- Ensure the script has execute permissions (`chmod +x scripts/update-prod.sh`).
- The script assumes the repository is at `/home/n0tv1cky/n0tv1cky-blog`.
- Check `update-prod.log` for execution logs and any errors.
- Git pull output is always logged.
- Build success: Logs "Build succeeded at [timestamp]".
- Build failure: Logs full output from `make prod-up` for troubleshooting.