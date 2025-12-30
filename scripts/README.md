# Automated Update Script

This script runs `git pull` and `make prod-up` every midnight to keep the blog platform updated with the latest changes and restart production containers.

## Files
- `update-prod.sh`: The main script that performs the update.
- `update-prod.log`: Log file where script output is appended. On success, only a timestamp and "Build succeeded" is logged. On failure, full build logs are stored for debugging.

## Git Authentication Setup

The script requires authentication to pull from the GitHub repository. You have two options:

### Option 1: Personal Access Token (Recommended)
1. Create a GitHub Personal Access Token at: https://github.com/settings/tokens
   - Select scopes: `repo` (for private repos) or `public_repo` (for public repos)
2. Create a file `/home/n0tv1cky/.env-git` with:
   ```
   GITHUB_TOKEN=your_token_here
   ```
3. Make it readable only by you: `chmod 600 /home/n0tv1cky/.env-git`
4. Update the cron job to source this file:
   ```bash
   crontab -e
   ```
   Change the line to:
   ```
   0 0 * * * . /home/n0tv1cky/.env-git; /home/n0tv1cky/n0tv1cky-blog/scripts/update-prod.sh
   ```

### Option 2: SSH Keys
1. Generate SSH key: `ssh-keygen -t ed25519 -C "your_email@example.com"`
2. Add the public key to GitHub: https://github.com/settings/keys
3. Change git remote to SSH: `git remote set-url origin git@github.com:n0tv1cky/n0tv1cky-blog.git`

## Cron Job
The script is scheduled to run daily at 00:00 via cron. After setting up authentication (see above), the cron job should be:
```
0 0 * * * . /home/n0tv1cky/.env-git; /home/n0tv1cky/n0tv1cky-blog/scripts/update-prod.sh
```

Or if using SSH:
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
   # 0 0 * * * . /home/n0tv1cky/.env-git; /home/n0tv1cky/n0tv1cky-blog/scripts/update-prod.sh
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