---
title: How VSCode Tunnels Bypass Firewalls Using Stateful Connections
slug: vscode-tunnels-bypass-firewalls
published: true
published_at: '2026-01-01T16:26:02.756569+05:30'
created_at: '2026-01-01T16:26:02.756569+05:30'
updated_at: '2026-01-01T16:27:56.886591+05:30'
description: Deep dive into how VSCode tunnels bypass UFW firewalls using stateful
  connections. Diving into why traditional firewalls can't block them and how to detect
  them.
tags: []
category: null
author: admin
---


## The Hypothesis

My VPS has port 22 blocked at the application level. I've configured UFW to deny all inbound traffic:

```bash
sudo ufw default deny incoming
sudo ufw allow 22/tcp
```

If a developer spins up VSCode tunnels on this machine, they're not changing the firewall rules, installing SSH daemon, or opening any listeners. They're using a signed Microsoft binary to create an outbound connection to Microsoft's relay servers. The firewall should stop this, right?

**It doesn't.**

And the kernel is the reason why.

---

## The Why: Stateful Firewalls and Outbound Initiation

Most firewall discussions assume the attacker is trying to knock on your door (inbound). UFW handles that. But VSCode tunnels don't knock—they *call home*, establish a conversation, and then hand the conversation back.

Here's the protocol:

```
VPS (code daemon)
    ↓ (outbound TLS to tunnel.vscode.dev)
TLS 1.3 Handshake + GitHub Device Code Auth
    ↓
WebSocket Upgrade (RFC 6455)
    ↓
Persistent multiplexed channel
    ↓
(Remote attacker connects to relay, relay pushes traffic back through websocket)
```

The critical insight: **Your firewall can't block return traffic on an established connection.**

This isn't a bug in UFW. It's how stateful firewalls work. Once your daemon initiates a TCP connection on port 443, the kernel marks it `ESTABLISHED` in the conntrack table. All return traffic is automatically allowed.

**No firewall rule can revoke that without killing the connection.**

---

## The Experiment: Proving It Works

### Starting VSCode Tunnel

Start the tunnel (it will prompt for GitHub auth)
```bash
code tunnel --accept-server-license-terms --name n0tv1cky-vps

# The tunnel process starts and establishes connection to Microsoft's relay servers
# Process output shows authentication and connection establishment
# Tunnel is now accessible via vscode.dev
```

The tunnel is now live, even with restrictive firewall rules.

---

### Wire-Level Proof — tcpdump Captures the Outbound SYN

```bash
# Start capturing outbound connections to VSCode's relay
sudo tcpdump -i eth0 -A -s 0 'tcp port 443 and (host tunnel.vscode.dev or host relay.tunnels.api.visualstudio.com)' 2>&1 | head -100

# The tcpdump would show outbound SYN packets to Microsoft's relay infrastructure (20.207.x.x)
vps-ip.48856 > 20.207.70.99:443: Flags [S], seq ...
# This is the **outbound** SYN from your VPS - the daemon initiates the connection
```

Compare this to SSH's behavior:

```bash
# If SSH were listening and someone tried to connect
sudo tcpdump -i eth0 -A 'tcp port 22' 2>&1 | head -50

# We would see inbound SYN from external client:
external-client-ip.54321 > vps-ip.22: Flags [S], seq ...
# Someone else initiates the connection to your listening SSH server
```

**Key difference:**
- SSH: **Inbound** SYN (client initiates, server listens)
- VSCode Tunnel: **Outbound** SYN (your daemon initiates, Microsoft relay responds)

Once my VPS sends that outbound SYN-ACK handshake, the kernel marks the connection as `ESTABLISHED`. All return traffic is allowed automatically. UFW cannot selectively block return traffic without breaking the connection, and it doesn't try.

---

### Kernel-Level Proof — No Listen Socket

This is the smoking gun. SSH creates a listening socket on port 22. VSCode tunnels don't.

```bash
# Shows all listening sockets on my VPS
sudo ss -tlnp
State  Recv-Q Send-Q Local Address:Port  Peer Address:Port Process
LISTEN 0      511    0.0.0.0:443            0.0.0.0:*     users:(("nginx",pid=30163,...))
LISTEN 0      1024   127.0.0.1:37195        0.0.0.0:*     users:(("code-994fd12f8d",pid=356800,fd=9))
LISTEN 0      511    0.0.0.0:80             0.0.0.0:*     users:(("nginx",pid=30163,...))
LISTEN 0      4096   0.0.0.0:22             0.0.0.0:*     users:(("sshd",pid=737,...))

# Note: VSCode has a LOCAL listener on 127.0.0.1:37195 (not accessible externally)
# ... but NO public listener for VSCode tunnel on ANY port
```

Now check established connections:

```bash
# This shows **established** connections:
sudo ss -tnp | grep -E 'tunnel|relay|visualstudio'

State    Recv-Q Send-Q Local Address           Foreign Address         PID/Program name
ESTAB    0      0      10.160.0.2:48856        20.207.70.99:443        364220/code-tunnel

# These are **outbound established connections** to Microsoft's relay infrastructure
# The connection is initiated from the VPS to Microsoft's servers on port 443
```

The firewall logic:

```
UFW Rule: "default deny incoming"
Code daemon initiates outbound 443? Allowed (default allow outgoing)
Connection becomes ESTABLISHED? Stateful, auto-allow return traffic
Result: Tunnel works despite SSH being blocked
```

---

### Strace Shows `connect()`, Not `listen()`

For absolute kernel-level proof, trace the VSCode daemon's syscalls:

```bash
# Get the PID of the code process
pgrep -f "code tunnel" | head -1
364220

# Trace file descriptors and connections
sudo strace -p 364220 -e trace=connect,open,openat 2>&1 | head -50
connect(23, {sa_family=AF_INET, sin_port=htons(443), sin_addr=inet_addr("20.207.70.99")}, 16) = 0
# ↑ connect() syscall: the process is initiating outbound

You will NOT see:
bind(3, {sa_family=AF_INET, sin_port=htons(12345), sin_addr=inet_aton("0.0.0.0")}, 16) = 0
listen(3, 128) = 0
# ↑ bind() + listen(): required for a listening socket
```

---

### DNS Resolution and Defense

While UFW can't stop the tunnel, your DNS resolver can:

```bash
# VSCode tunnel uses hardcoded relay IPs or CDN-based resolution
# The actual connections go to Microsoft Azure infrastructure

# You can see the resolved IPs in active connections:
sudo ss -tnp | grep code-tunnel
ESTAB    0      0      10.160.0.2:48856       20.207.70.99:443        364220/code-tunnel

# The relay servers are in Microsoft Azure's IP space (20.x.x.x range)
```

**Defense mechanism:** A DNS firewall (Pi-hole, OPNsense, Cloudflare Zero Trust) can **block** queries for `tunnel.vscode.dev`, `relay.tunnels.api.visualstudio.com`, `*.visualstudio.com`, etc. This happens **before** the TCP connection is attempted, and it's easier to audit.

---

## The Threat Model: Why This Matters

### Why Firewalls Can't Stop Outbound Tunnels

| Layer | What UFW Can Do | What It Cannot Do |
|-------|------------------|-------------------|
| **Network (Layer 3-4)** | Block inbound SYN on specific ports | Block established connections without breaking them |
| **Transport (Layer 4)** | Enforce stateful rules on new connections | Revoke ESTABLISHED state mid-stream |
| **Application (Layer 7)** | (None — UFW is Layer 3-4 only) | Inspect WebSocket payload or detect relay domain |

### Real Attack Scenario

An attacker can:

1. **Deliver malware** to a developer's Windows machine via phishing (.LNK file).
2. **Silently download Python** distribution and a malicious script.
3. **Check for VSCode installation**, download CLI if missing.
4. **Execute**: `code.exe tunnel --accept-server-license-terms --name victim-pc`
5. **Exfiltrate activation code** to attacker's C&C server.
6. **Log in at GitHub with that code** at `https://github.com/login/device`.
7. **Full RCE on victim's machine**—file access, command execution, terminal access.

**All without changing firewall rules. All through Microsoft's trusted infrastructure.**

This is exactly what Stately Taurus APT (Chinese state-sponsored) did. Microsoft's relay servers became the attack infrastructure.

---

## Detecting VSCode Tunnels on Your VPS

You can't firewall-block them, so you must detect and alert on them.

### 1. Process-Level Detection

```bash
# Hunt for the process
ps aux | grep -E 'code.*tunnel'
n0tv1cky  364202  0.0  0.0   2800  1992 pts/1    S+   10:27   0:00 sh /usr/bin/code tunnel
n0tv1cky  364207  0.2  2.2 1461254096 89420 pts/1 Sl+ 10:27 0:00 /usr/share/code/bin/../code ...
n0tv1cky  364220  0.2  0.6 504444 26308 pts/1    SLl+ 10:27   0:00 /usr/share/code/bin/code-tunnel tunnel
```

### 2. Network-Level Detection

```bash
# Show long-lived connections to known relay domains
sudo ss -tnp | grep -E '(visualstudio|tunnel|relay)'

# Actual output:
ESTAB    0      0      10.160.0.2:48856       20.207.70.99:443        364220/code-tunnel

# Monitor with this script (run every 5 minutes):
#!/bin/bash
ss -tnp | grep -q '20\.207\|visualstudio' && \
  echo "ALERT: VSCode tunnel detected at $(date)" | logger -t vscode-monitor
```

### 3. Log-Level Detection

```bash
# Check for GitHub authentication attempts
sudo grep -r "github" /var/log/ /home/*/.vscode* 2>/dev/null

# Check for the activation code exchange
sudo journalctl -xe | grep -i "tunnel\|activation"

# Monitor code CLI output if running as daemon
tail -f /var/log/vscode-tunnel.log
```

---

## The Safe Deployment Pattern (For Production VPS)

If you must allow VSCode tunnels on a production VPS, follow this model:

### 1. Never Use Tunnels for Root/Privileged Access

```bash
# DANGEROUS: Running tunnel as root
sudo code tunnel --accept-server-license-terms

# BEST PRACTICE: Run as unprivileged user
su - developer
code tunnel --accept-server-license-terms
```

### 2. Enforce Outbound IP Allowlisting

```bash
# Only allow 443 to Microsoft's known relay infrastructure
# Get current relay IPs from active connections:
sudo ss -tnp | grep code-tunnel
# Shows connections to IPs like 20.207.70.99 (Microsoft Azure range)

# Create UFW rule for Microsoft Azure relay ranges:
sudo ufw allow out to 20.207.0.0/16 port 443
sudo ufw allow out to 20.74.0.0/16 port 443
sudo ufw deny out port 443  # Block all other HTTPS

# Verify:
sudo ufw status
```

### 3. Rotate Activation Codes Regularly

```bash
# Log out (invalidates activation code)
code tunnel user logout

# GitHub device code expires after 15 minutes of inactivity
# Force re-auth every 24 hours with a cron job
```

### 4. Monitoring and Alerting

```bash
# Monitor tunnel connection lifetime
watch -n 5 'ss -tnp | grep -i "code-tunnel\|20\.207"'

# Alert if tunnel connection drops and restarts (indicator of reauth/compromise)
# Alert if tunnel is active outside business hours (indicator of persistence)
```

---

## Conclusion

**Kernel Architecture Wins Over Firewall Rules**

VSCode tunnels work when SSH is blocked because they don't ask permission—they ask for forgiveness.

The daemon initiates an **outbound** TCP connection to Microsoft's infrastructure. The kernel marks it `ESTABLISHED`. UFW allows all return traffic on established connections without consulting rules. The firewall has already made its decision at layer 3-4.

**This is not a bug in UFW.** This is how every stateful firewall on earth works. It's correct behavior from the kernel's perspective.

But it's a blind spot for defenders who assume "deny inbound = secure."

### What You Should Do

1. **Never rely on UFW to block outbound tunnels.** It can't without breaking the connection.

2. **Use DNS filtering** (Pi-hole, Cloudflare Zero Trust, OPNsense) to block `*.tunnels.api.visualstudio.com` at the resolver level.

3. **Monitor for `code tunnel` processes** with process-level detection and alert on unexpected activations.

4. **Enforce IP allowlisting for 443** to known Microsoft relay ranges if you must allow tunnels.

5. **Rotate activation codes** every 24 hours and log all tunnel sessions with unique identifiers.

6. **Treat tunnels like SSH keys**—they grant shell access. Give them the same scrutiny.

For a self-hosted single VPS like mine, SSH key-only authentication with Fail2Ban is simpler, more auditable, and doesn't require third-party relay infrastructure. Tunnels are developer convenience; they're not a security primitive.

But if attackers are using them to bypass your defenses, understand the kernel mechanics. The firewall isn't failing—it's working as designed. Your blind spot is at the DNS resolver and the process list, not the netfilter rules.

---

## Quick Reference: Detection Commands

```bash
# Quick hunt for tunnels
ps aux | grep -i tunnel
ss -tnp | grep -E '(code-tunnel|20\.207\.|relay)'
sudo journalctl -n 50 | grep -i tunnel
lsof -i :443 | grep code
```

### Firewall Rules

```bash
# Allow only known VSCode relay IPs
sudo ufw deny out port 443 comment "Default deny HTTPS"
sudo ufw allow out to 20.207.0.0/16 port 443 comment "VSCode relay Azure"
sudo ufw allow out to 20.74.0.0/16 port 443 comment "VSCode relay"
sudo ufw allow out to 23.98.0.0/15 port 443 comment "Azure CDN"
sudo ufw reload
```

---

**Author's Note:** This post was written on a GCP VPS running Ubuntu 22.04, Docker and Nginx. All experiments were conducted on a production machine. The findings are reproducible on any Linux host with kernel >= 4.15 (netfilter/conntrack).
